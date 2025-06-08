# train.py
import os
nltk.data.path.append(os.path.join(os.path.dirname(__file__), "nltk_data"))
import json
import random
import pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import tensorflow as tf
import nltk
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords

# Download NLTK resources
nltk.download('punkt', download_dir='/opt/render/nltk_data')
nltk.download('wordnet', download_dir='/opt/render/nltk_data')
nltk.download('stopwords', download_dir='/opt/render/nltk_data')

nltk.data.path.append("/opt/render/nltk_data") 

# Load intents
with open("intents.json", "r", encoding="utf-8") as file:
    intents = json.load(file)

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

# Collect all data
corpus = []
labels = []

for intent in intents['intents']:
    for pattern in intent['patterns']:
        words = nltk.word_tokenize(pattern)
        words = [lemmatizer.lemmatize(w.lower()) for w in words if w.lower() not in stop_words]
        clean_pattern = " ".join(words)
        corpus.append(clean_pattern)
        labels.append(intent['tag'])

# Encode labels
label_encoder = LabelEncoder()
y = label_encoder.fit_transform(labels)

# TF-IDF vectorization
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(corpus).toarray()

# Save tokenizer and labels
pickle.dump(vectorizer, open("tfidf_vectorizer.pkl", "wb"))
pickle.dump(label_encoder, open("label_encoder.pkl", "wb"))

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1, random_state=42)

# Model
model = tf.keras.Sequential([
    tf.keras.layers.Dense(128, input_shape=(X.shape[1],), activation='relu'),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(len(label_encoder.classes_), activation='softmax')
])

model.compile(loss='sparse_categorical_crossentropy', optimizer='adam', metrics=['accuracy'])
model.fit(X_train, y_train, epochs=3000, batch_size=20, verbose=1)

# Save model
model.save("chatbot_model_optimized.h5")
print("Training completed and model saved as chatbot_model_optimized.h5")
