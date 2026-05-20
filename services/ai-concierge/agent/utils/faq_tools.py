# import os
# import getpass
# from typing import Dict, Any
# from langchain_core.tools import tool
# from pinecone import Pinecone
# import google.generativeai as genai

# base_url = 'https://enzo01.flyumojaairways.com'

# try:
#     pinecone_api_key = os.getenv("PINECONE_API_KEY")
#     if not pinecone_api_key:
#         pinecone_api_key = getpass.getpass("PINECONE_API_KEY: ")
#     pc = Pinecone(api_key=pinecone_api_key)
#     genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    
#     # Create index if it doesn't exist
#     if "airline" not in pc.list_indexes():
#         pc.create_index(
#             name="airline",
#             dimension=768,  # Dimension for text-embedding-004 model
#             metric="cosine"
#         )
#     index = pc.Index("airline")
# except Exception as e:
#     print(f"Initialization error: {e}")
#     index = None

# def _set_env(var: str):
#     if not os.environ.get(var):
#         os.environ[var] = getpass.getpass(f"{var}: ")


# @tool
# def pdf_faq_retriever(query: str) -> Dict[str, Any]:
#     """Retrieve verified answers from official documentation"""
#     try:
#         if not query or len(query) < 3:
#             return {"error": "Please provide a more specific question"}
            
#         if not index:
#             return {"error": "Documentation system is currently unavailable"}
            
#         embedding = genai.embed_content(
#             model="models/text-embedding-004",
#             content=query,
#             task_type="retrieval_query"
#         ).get('embedding', [])
        
#         if not embedding:
#             return {"error": "Failed to process your question"}
            
#         results = index.query(
#             vector=embedding,
#             top_k=3,
#             include_metadata=True,
#             timeout=15
#         )
        
#         if not results.matches:
#             return {"response": "No specific information found in our documentation"}
            
#         # Return only clean text excerpts
#         return {
#             "response": "Documentation excerpts:\n" + 
#             "\n\n".join(
#                 f"Excerpt {i+1}: {match.metadata.get('text', '')}" 
#                 for i, match in enumerate(results.matches)
#             )
#         }
        
#     except Exception as e:
#         print(f"GELF error: {e}")
#         return {"error": "Unable to retrieve information at this time"}
