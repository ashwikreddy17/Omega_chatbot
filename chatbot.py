# chatbot.py
import json
import random
import pickle
import numpy as np
import nltk
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
from keras.models import load_model

nltk.download('punkt')
nltk.download('wordnet')
nltk.download('stopwords')
# Load model and data
model = load_model("chatbot_model_optimized.h5")
intents = json.load(open("intents.json", "r", encoding="utf-8"))
vectorizer = pickle.load(open("tfidf_vectorizer.pkl", "rb"))
label_encoder = pickle.load(open("label_encoder.pkl", "rb"))

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

def preprocess_input(sentence):
    words = nltk.word_tokenize(sentence)
    words = [lemmatizer.lemmatize(w.lower()) for w in words if w.lower() not in stop_words]
    return " ".join(words)

def predict_class(sentence):
    clean_input = preprocess_input(sentence)
    vec = vectorizer.transform([clean_input]).toarray()
    probs = model.predict(vec)[0]
    ERROR_THRESHOLD = 0.10
    results = [[i, p] for i, p in enumerate(probs) if p > ERROR_THRESHOLD]
    results.sort(key=lambda x: x[1], reverse=True)
    return [{"intent": label_encoder.inverse_transform([r[0]])[0], "probability": str(r[1])} for r in results]

def get_response(message: str) -> str:
    intents_list = predict_class(message)
    
    if not intents_list:
        # Fallback if no match
        fallback = next((i for i in intents['intents'] if i['tag'] == 'fallback'), None)
        return random.choice(fallback['responses']) if fallback else "Sorry, I don't understand that."
    
    tag = intents_list[0]['intent']
    for intent in intents['intents']:
        if intent['tag'] == tag:
            return random.choice(intent['responses'])
    
    return "Sorry, I couldn't find a good answer."

if __name__ == "__main__":
    print("OMEGA AI is ready to chat!")
    while True:
        message = input("You: ")
        intents_pred = predict_class(message)
        print(f"DEBUG: {intents_pred}")
        response = get_response(message)
        print(f"OMEGA AI: {response}")
