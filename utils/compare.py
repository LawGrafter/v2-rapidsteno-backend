# import sys
# import json
# import spacy
# import difflib

# nlp = spacy.load("en_core_web_sm")

# def compare_sentences(orig_sentence, user_sentence):
#     result = {
#         "capital_mistakes": {
#             "count": 0,
#             "words": []
#         },
#         "missing_words": {
#             "count": 0,
#             "words": []
#         },
#         "punctuation_mistakes": {
#             "count": 0,
#             "words": []
#         },
#         "word_mismatches": {
#             "count": 0,
#             "words": []
#         }
#     }

#     orig_tokens = [token for token in orig_sentence if not token.is_space]
#     user_tokens = [token for token in user_sentence if not token.is_space]

#     orig_words = [token.text.lower() for token in orig_tokens if not token.is_punct]
#     user_words = [token.text.lower() for token in user_tokens if not token.is_punct]

#     matcher = difflib.SequenceMatcher(None, orig_words, user_words)
#     for tag, i1, i2, j1, j2 in matcher.get_opcodes():
#         if tag == 'replace':
#             result['word_mismatches']["count"] += max(i2 - i1, j2 - j1)
#             result['word_mismatches']["words"].extend(orig_words[i1:i2])
#         elif tag == 'delete':
#             result['missing_words']["count"] += (i2 - i1)
#             result['missing_words']["words"].extend(orig_words[i1:i2])
#         elif tag == 'insert':
#             result['missing_words']["count"] += (j2 - j1)
#             result['missing_words']["words"].extend(user_words[j1:j2])

#     # Capitalization mistakes
#     orig_texts = [token.text for token in orig_tokens if not token.is_punct]
#     user_texts = [token.text for token in user_tokens if not token.is_punct]
#     for o_text, u_text in zip(orig_texts, user_texts):
#         if o_text.lower() == u_text.lower() and o_text != u_text:
#             result['capital_mistakes']["count"] += 1
#             result['capital_mistakes']["words"].append(u_text)

#     # Final punctuation check
#     orig_end = orig_tokens[-1].text if orig_tokens and orig_tokens[-1].is_punct else ""
#     user_end = user_tokens[-1].text if user_tokens and user_tokens[-1].is_punct else ""
#     if orig_end != user_end:
#         result['punctuation_mistakes']["count"] += 1
#         result['punctuation_mistakes']["words"].append(f"Expected: '{orig_end}', Found: '{user_end or 'None'}'")

#     return result

# def compare_paragraphs(original, user_input):
#     doc_orig = nlp(original)
#     doc_user = nlp(user_input)

#     sentences_orig = list(doc_orig.sents)
#     sentences_user = list(doc_user.sents)

#     # Initialize combined results
#     results = {
#         "total_mistakes": 0,
#         "capital_mistakes": {
#             "count": 0,
#             "words": []
#         },
#         "missing_words": {
#             "count": 0,
#             "words": []
#         },
#         "punctuation_mistakes": {
#             "count": 0,
#             "words": []
#         },
#         "word_mismatches": {
#             "count": 0,
#             "words": []
#         }
#     }

#     # Compare sentence by sentence
#     for i in range(max(len(sentences_orig), len(sentences_user))):
#         orig = sentences_orig[i] if i < len(sentences_orig) else nlp("")
#         user = sentences_user[i] if i < len(sentences_user) else nlp("")
#         sentence_result = compare_sentences(orig, user)
#         for k in sentence_result:
#             results[k]["count"] += sentence_result[k]["count"]
#             results[k]["words"].extend(sentence_result[k]["words"])

#     # Sum up total
#     results["total_mistakes"] = (
#         results["capital_mistakes"]["count"] +
#         results["missing_words"]["count"] +
#         results["punctuation_mistakes"]["count"] +
#         results["word_mismatches"]["count"]
#     )

#     return results

# if __name__ == "__main__":
#     data = json.loads(sys.stdin.read())
#     original = data['original']
#     user_input = data['user_input']
#     result = compare_paragraphs(original, user_input)
#     print(json.dumps(result, indent=2))


import sys
import json
import spacy
import difflib

# Load spaCy model
nlp = spacy.load("en_core_web_sm")

# Clean common encoding issues
def clean_text(text):
    return (
        text.replace("â€™", "'")
            .replace("â€œ", '"')
            .replace("â€", '"')
            .replace("Ã", " ")
            .replace("™", "'")
            .replace("�", "")
    )

# Compare two sentences
def compare_sentences(orig_sentence, user_sentence):
    result = {
        "capital_mistakes": {"count": 0, "words": []},
        "missing_words": {"count": 0, "words": []},
        "punctuation_mistakes": {"count": 0, "words": []},
        "spelling_mistakes": {"count": 0, "words": []},
        "extra_words": {"count": 0, "words": []}
    }

    orig_tokens = [token for token in orig_sentence if not token.is_space]
    user_tokens = [token for token in user_sentence if not token.is_space]

    orig_words = [token.text for token in orig_tokens if not token.is_punct]
    user_words = [token.text for token in user_tokens if not token.is_punct]

    orig_lower = [w.lower() for w in orig_words]
    user_lower = [w.lower() for w in user_words]

    matcher = difflib.SequenceMatcher(None, orig_lower, user_lower)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'replace':
            for i, j in zip(range(i1, i2), range(j1, j2)):
                if difflib.get_close_matches(user_words[j], [orig_words[i]], cutoff=0.6):
                    result['spelling_mistakes']['count'] += 1
                    result['spelling_mistakes']['words'].append(user_words[j])
                else:
                    result['missing_words']['count'] += 1
                    result['missing_words']['words'].append(orig_words[i])
                    result['extra_words']['count'] += 1
                    result['extra_words']['words'].append(user_words[j])
        elif tag == 'delete':
            result['missing_words']['count'] += (i2 - i1)
            result['missing_words']['words'].extend(orig_words[i1:i2])
        elif tag == 'insert':
            result['extra_words']['count'] += (j2 - j1)
            result['extra_words']['words'].extend(user_words[j1:j2])

    # Capitalization mistakes
    for o, u in zip(orig_words, user_words):
        if o.lower() == u.lower() and o != u:
            result['capital_mistakes']["count"] += 1
            result['capital_mistakes']["words"].append(u)

    # End punctuation mismatch
    orig_end = orig_tokens[-1].text if orig_tokens and orig_tokens[-1].is_punct else ""
    user_end = user_tokens[-1].text if user_tokens and user_tokens[-1].is_punct else ""
    if orig_end != user_end:
        result['punctuation_mistakes']["count"] += 1
        result['punctuation_mistakes']["words"].append(f"Expected: '{orig_end}', Found: '{user_end or 'None'}'")

    return result


# Compare full paragraphs
def compare_paragraphs(original, user_input):
    doc_orig = nlp(original)
    doc_user = nlp(user_input)

    sentences_orig = list(doc_orig.sents)
    sentences_user = list(doc_user.sents)

    results = {
        "total_mistakes": 0,
        "capital_mistakes": {"count": 0, "words": []},
        "missing_words": {"count": 0, "words": []},
        "punctuation_mistakes": {"count": 0, "words": []}
    }

    for i in range(max(len(sentences_orig), len(sentences_user))):
        orig = sentences_orig[i] if i < len(sentences_orig) else nlp("")
        user = sentences_user[i] if i < len(sentences_user) else nlp("")
        sentence_result = compare_sentences(orig, user)
        for k in sentence_result:
            results[k]["count"] += sentence_result[k]["count"]
            results[k]["words"].extend(sentence_result[k]["words"])

    results["total_mistakes"] = (
        results["capital_mistakes"]["count"] +
        results["missing_words"]["count"] +
        results["punctuation_mistakes"]["count"]
    )

    return results

# Entry point
if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    original = clean_text(data['original'])
    user_input = clean_text(data['user_input'])
    result = compare_paragraphs(original, user_input)
    print(json.dumps(result, indent=2))
