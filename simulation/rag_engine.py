import os
import glob
import logging
import json
import urllib.parse
import urllib.request
from typing import List, Dict, Any, Optional

logger = logging.getLogger("frex-rag-engine")

# ---------------------------------------------------------------------------
# Hybrid RAG Engine Class (Local Vector + Live Web Search Fallback)
# ---------------------------------------------------------------------------
class FactoryRagEngine:
    def __init__(self, data_dir: str = "../data/rag_knowledge", db_dir: str = "rag_chroma_db"):
        self.data_dir = data_dir
        self.db_dir = db_dir
        self.collection = None
        self.chroma_client = None
        self.use_fallback_embeddings = False
        self.documents_store = [] # Fallback in-memory list of dicts if Chroma is unavailable
        
        self._init_vector_store()
        self._ingest_seed_knowledge()

    def _init_vector_store(self):
        """Initializes ChromaDB or sets up fallback memory vector store."""
        try:
            import chromadb
            from chromadb.utils import embedding_functions

            os.makedirs(self.db_dir, exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(path=self.db_dir)
            
            # Use SentenceTransformer embedding function if available
            try:
                ef = embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name="all-MiniLM-L6-v2"
                )
                self.collection = self.chroma_client.get_or_create_collection(
                    name="factory_knowledge",
                    embedding_function=ef
                )
                logger.info("ChromaDB vector store initialized with SentenceTransformer embeddings.")
            except Exception as ef_err:
                logger.warning("Defaulting to ChromaDB standard embedding function: %s", ef_err)
                self.collection = self.chroma_client.get_or_create_collection(
                    name="factory_knowledge"
                )
        except Exception as e:
            logger.warning("ChromaDB unavailable (%s). Operating in-memory vector fallback mode.", e)
            self.use_fallback_embeddings = True

    def _ingest_seed_knowledge(self):
        """Discovers markdown files in data_dir and ingests them into vector DB."""
        possible_paths = [
            self.data_dir,
            os.path.join(os.path.dirname(__file__), "..", "data", "rag_knowledge"),
            os.path.join(os.path.dirname(__file__), "data", "rag_knowledge"),
            "data/rag_knowledge"
        ]
        
        target_dir = None
        for path in possible_paths:
            if os.path.exists(path):
                target_dir = path
                break
                
        if not target_dir:
            logger.warning("RAG Knowledge directory not found. Creation on demand enabled.")
            return

        md_files = glob.glob(os.path.join(target_dir, "*.md"))
        logger.info("Found %d RAG knowledge files in %s", len(md_files), target_dir)

        chunks_to_add = []
        metadatas_to_add = []
        ids_to_add = []

        for file_path in md_files:
            filename = os.path.basename(file_path)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                # Chunk by markdown headers (##) or sections
                sections = content.split("\n## ")
                for idx, sec in enumerate(sections):
                    clean_sec = sec.strip()
                    if not clean_sec:
                        continue
                    if idx > 0:
                        clean_sec = "## " + clean_sec
                    
                    chunk_id = f"{filename}_sec_{idx}"
                    chunks_to_add.append(clean_sec)
                    metadatas_to_add.append({"source": filename, "section_index": idx})
                    ids_to_add.append(chunk_id)

                    # Backup store for in-memory fallback
                    self.documents_store.append({
                        "id": chunk_id,
                        "text": clean_sec,
                        "metadata": {"source": filename, "section_index": idx}
                    })
            except Exception as file_err:
                logger.error("Failed to read RAG knowledge file %s: %s", file_path, file_err)

        if chunks_to_add and self.collection:
            try:
                # Upsert into ChromaDB
                self.collection.upsert(
                    documents=chunks_to_add,
                    metadatas=metadatas_to_add,
                    ids=ids_to_add
                )
                logger.info("Successfully indexed %d knowledge chunks in ChromaDB.", len(chunks_to_add))
            except Exception as upsert_err:
                logger.error("Error indexing into ChromaDB: %s", upsert_err)

    def retrieve_context(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Retrieves top_k context chunks matching query from local vector store."""
        results = []
        if self.collection and not self.use_fallback_embeddings:
            try:
                res = self.collection.query(
                    query_texts=[query],
                    n_results=top_k
                )
                if res and res.get('documents') and res['documents'][0]:
                    docs = res['documents'][0]
                    metas = res['metadatas'][0] if res.get('metadatas') else [{}] * len(docs)
                    ids = res['ids'][0] if res.get('ids') else [f"doc_{i}" for i in range(len(docs))]
                    
                    for doc, meta, doc_id in zip(docs, metas, ids):
                        results.append({
                            "id": doc_id,
                            "text": doc,
                            "source": f"📄 Local: {meta.get('source', 'Knowledge Base')}"
                        })
                    return results
            except Exception as query_err:
                logger.error("ChromaDB query error: %s. Falling back to keyword search.", query_err)

        # Fallback keyword match search
        query_words = set(query.lower().split())
        scored_docs = []
        for item in self.documents_store:
            text_lower = item['text'].lower()
            score = sum(1 for word in query_words if word in text_lower)
            if score > 0:
                scored_docs.append((score, item))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        top_items = [doc for _, doc in scored_docs[:top_k]]
        if not top_items and self.documents_store:
            top_items = self.documents_store[:top_k]

        for item in top_items:
            results.append({
                "id": item["id"],
                "text": item["text"],
                "source": f"📄 Local: {item['metadata'].get('source', 'Knowledge Base')}"
            })

        return results

    def fetch_web_search_context(self, query: str) -> List[Dict[str, Any]]:
        """Executes a lightweight live web search query to retrieve external technical results."""
        logger.info("Executing Web Search Fallback query for: %s", query)
        web_results = []
        try:
            # Format search URL (DuckDuckGo Instant Answer / HTML Search)
            encoded_query = urllib.parse.quote_plus(query + " industrial equipment troubleshooting manual")
            url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
            
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=4) as response:
                html = response.read().decode('utf-8', errors='ignore')
                
            # Simple text parsing with regex fallback
            import re
            snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)
            
            for i, snip in enumerate(snippets[:2]):
                clean_text = re.sub(r'<[^>]+>', '', snip).strip()
                if clean_text:
                    web_results.append({
                        "id": f"web_{i}",
                        "text": f"Web Search Result: {clean_text}",
                        "source": "🌐 Live Web Search"
                    })
        except Exception as err:
            logger.warning("Live web search fallback returned no external results (%s). Using local RAG.", err)
            
        return web_results

    def query(self, query_text: str, machine_id: Optional[str] = None, enable_web_search: bool = True) -> Dict[str, Any]:
        """Hybrid RAG query workflow combining Local Vector DB + Live Web Search Fallback."""
        search_query = f"{machine_id} {query_text}" if machine_id else query_text
        local_contexts = self.retrieve_context(search_query, top_k=3)

        web_contexts = []
        # If web search is enabled and local results are sparse or specifically requested
        if enable_web_search and (len(local_contexts) < 2 or "web" in query_text.lower() or "latest" in query_text.lower()):
            web_contexts = self.fetch_web_search_context(query_text)

        all_contexts = local_contexts + web_contexts
        context_str = "\n\n".join([f"--- Source: {c['source']} ---\n{c['text']}" for c in all_contexts])
        sources = list(set([c['source'] for c in all_contexts]))

        answer = self._generate_response(query_text, context_str, machine_id)

        return {
            "query": query_text,
            "machine_id": machine_id,
            "answer": answer,
            "sources": sources,
            "context_chunks_count": len(all_contexts),
            "is_hybrid": len(web_contexts) > 0
        }

    def diagnose_failure(self, model_type: str, prediction_data: Dict[str, Any], enable_web_search: bool = True) -> Dict[str, Any]:
        """Hybrid RAG diagnosis for high risk predictions from ML models."""
        query_text = f"Troubleshooting protocol for {model_type} defect alert. Data: {prediction_data}"
        local_contexts = self.retrieve_context(query_text, top_k=3)

        web_contexts = []
        if enable_web_search and len(local_contexts) == 0:
            web_contexts = self.fetch_web_search_context(f"{model_type} maintenance repair manual")

        all_contexts = local_contexts + web_contexts
        context_str = "\n\n".join([f"--- Source: {c['source']} ---\n{c['text']}" for c in all_contexts])
        sources = list(set([c['source'] for c in all_contexts]))

        answer = self._generate_response(
            query=f"Provide diagnostic summary and repair SOP for {model_type} alert.",
            context=context_str,
            extra_details=f"ML Prediction Payload: {prediction_data}"
        )

        return {
            "model_type": model_type,
            "prediction_data": prediction_data,
            "diagnostic_summary": answer,
            "sources": sources,
            "is_hybrid": len(web_contexts) > 0
        }

    def _generate_response(self, query: str, context: str, machine_id: Optional[str] = None, extra_details: str = "") -> str:
        """Generates response using Gemini API if key exists, otherwise generates structured grounded answer."""
        gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        
        if gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel("gemini-1.5-flash")
                
                prompt = f"""You are the Industrial AI Copilot for FREX-SOS Factory Simulation.
Answer the user query based strictly on the retrieved local vector database and web search context below.

CONTEXT:
{context}

{f"MACHINE ID: {machine_id}" if machine_id else ""}
{f"EXTRA DETAILS: {extra_details}" if extra_details else ""}
USER QUERY: {query}

INSTRUCTIONS:
1. Provide a concise, actionable response with clear bullet points.
2. State recommended SOP actions and maintenance steps.
3. Explicitly cite whether information comes from Local Manuals or Web Search.
"""
                response = model.generate_content(prompt)
                return response.text
            except Exception as llm_err:
                logger.error("Gemini API call failed (%s). Falling back to RAG context engine.", llm_err)

        # Smart Grounded Fallback Response
        fallback_res = f"### Hybrid RAG Diagnostic & Maintenance Advice\n\n"
        if machine_id:
            fallback_res += f"**Target Machine**: `{machine_id}`\n\n"
        if extra_details:
            fallback_res += f"**Model Alert Details**: {extra_details}\n\n"

        fallback_res += "#### Recommended Actions & Retrieved Documentation:\n"
        if context:
            fallback_res += f"{context}\n\n"
            fallback_res += "> *Note: Multi-source response generated from local manuals and live web search fallbacks.*"
        else:
            fallback_res += "No direct SOP match found in knowledge base. Inspect general machine electrical and hydraulic connections."

        return fallback_res

# Single global instance
rag_engine = FactoryRagEngine()
