import re
import random
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import pipeline

app = Flask(__name__)
CORS(app)

# Load the summarization pipeline
print("Loading summarization model... This may take a while on first run.")
try:
    # Use t5-small as it's generally more compatible
    summarizer = pipeline("summarization", model="t5-small")
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading AI model: {e}")
    print("Falling back to rule-based summarization.")
    summarizer = None

def rule_based_summarize(text):
    """A simple rule-based summarizer as a fallback."""
    sentences = re.split(r'(?<=[.!?]) +', text)
    if len(sentences) <= 3:
        return text
    # Take the first sentence, one from the middle, and the last one
    selected = [sentences[0], sentences[len(sentences)//2], sentences[-1]]
    return " ".join(selected)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    try:
        if summarizer:
            summary = summarizer(text, max_length=150, min_length=50, do_sample=False)
            summarized_text = summary[0]['summary_text']
        else:
            summarized_text = rule_based_summarize(text)
        return jsonify({'summary': summarized_text})
    except Exception as e:
        # If AI summary fails during runtime, use fallback
        print(f"Runtime error in summarization: {e}")
        return jsonify({'summary': rule_based_summarize(text)})

@app.route('/quiz', methods=['POST'])
def generate_quiz():
    data = request.json
    summary = data.get('summary', '')
    
    if not summary:
        return jsonify({'error': 'No summary provided'}), 400
    
    try:
        # Simple MCQ generation logic based on key terms in the summary
        questions = []
        if not summary or len(summary.strip()) < 5:
             return jsonify({'quiz': []})

        sentences = re.split(r'(?<=[.!?]) +', summary)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return jsonify({'quiz': []})

        # Filter for sentences that look like they have good information
        potential_sentences = [s for s in sentences if len(s.split()) > 5]
        
        # If we don't have enough long sentences, take what we have
        if len(potential_sentences) < 5:
            potential_sentences = sentences

        # Shuffle to get variety
        random.shuffle(potential_sentences)
        
        # Limit to 5-7 questions
        target_count = min(len(potential_sentences), 6)
        
        # Keywords for distractors - common academic terms if we run out of context
        fallback_distractors = ["Inheritance", "Variable", "Algorithm", "Framework", "Database", "Cloud", "API", "Protocol"]

        for i in range(target_count):
            sentence = potential_sentences[i]
            words = sentence.split()
            
            # Simple heuristic: find a noun/capitalized word or a long word as the "answer"
            # In a real production app, we'd use NLP like spaCy for NER/POS tagging
            candidates = [w.strip(".,!?;:\"") for w in words if len(w) > 5 and w[0].isupper()]
            if not candidates:
                candidates = [w.strip(".,!?;:\"") for w in words if len(w) > 6]
            
            if not candidates:
                continue
                
            answer = random.choice(candidates)
            question_text = sentence.replace(answer, "_______")
            
            # Generate distractors
            distractors = set()
            # Try to get other words from the same summary
            other_words = [w.strip(".,!?;:\"") for w in summary.split() if len(w) > 4 and w.lower() != answer.lower()]
            
            while len(distractors) < 3:
                if other_words:
                    d = random.choice(other_words)
                    if d.lower() != answer.lower():
                        distractors.add(d)
                else:
                    distractors.add(random.choice(fallback_distractors))
            
            options = list(distractors) + [answer]
            random.shuffle(options)
            
            questions.append({
                'question': question_text,
                'options': options,
                'answer': answer
            })
            
        return jsonify({'quiz': questions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
