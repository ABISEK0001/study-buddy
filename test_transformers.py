from transformers import pipeline
try:
    print("Testing pipeline...")
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    print("Model loaded successfully.")
    res = summarizer("Hello world. This is a test of the summarization pipeline to see if it works.", max_length=10, min_length=5)
    print("Result:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
