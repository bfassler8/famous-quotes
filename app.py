import csv
import io
import json
import os
import random
from flask import Flask, jsonify, render_template, request, Response

app = Flask(__name__)

# Path to the quotes data
DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "quotes.json")


def load_quotes():
    """Load quotes from the JSON data file."""
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


# Cache quotes in memory
ALL_QUOTES = load_quotes()


@app.route("/")
def index():
    """Render the main single-page application."""
    return render_template("index.html")


@app.route("/api/quotes/random", methods=["GET"])
def get_random_quote():
    """Return a random quote, optionally filtered by category or author."""
    category = request.args.get("category", "").strip().lower()
    author = request.args.get("author", "").strip().lower()

    candidates = ALL_QUOTES

    if category:
        candidates = [q for q in candidates if q.get("category", "").lower() == category]

    if author:
        candidates = [q for q in candidates if author in q.get("author", "").lower()]

    if not candidates:
        return jsonify({
            "error": "No quotes match the specified filters",
            "filters": {"category": category, "author": author}
        }), 404

    return jsonify(random.choice(candidates))


@app.route("/api/quotes", methods=["GET"])
def get_quotes():
    """Search and filter quotes by text, category, or author."""
    q = request.args.get("q", "").strip().lower()
    category = request.args.get("category", "").strip().lower()
    author = request.args.get("author", "").strip().lower()

    results = ALL_QUOTES

    if category:
        results = [quote for quote in results if quote.get("category", "").lower() == category]

    if author:
        results = [quote for quote in results if author in quote.get("author", "").lower()]

    if q:
        results = [
            quote for quote in results
            if (
                q in quote.get("quote", "").lower()
                or q in quote.get("author", "").lower()
                or any(q in tag.lower() for tag in quote.get("tags", []))
            )
        ]

    return jsonify({
        "total": len(results),
        "quotes": results
    })


@app.route("/api/quotes/export", methods=["GET"])
def export_quotes_csv():
    """Export filtered quotes as downloadable CSV file."""
    q = request.args.get("q", "").strip().lower()
    category = request.args.get("category", "").strip().lower()
    author = request.args.get("author", "").strip().lower()

    results = ALL_QUOTES

    if category:
        results = [quote for quote in results if quote.get("category", "").lower() == category]

    if author:
        results = [quote for quote in results if author in quote.get("author", "").lower()]

    if q:
        results = [
            quote for quote in results
            if (
                q in quote.get("quote", "").lower()
                or q in quote.get("author", "").lower()
                or any(q in tag.lower() for tag in quote.get("tags", []))
            )
        ]

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(["ID", "Quote", "Author", "Category", "Tags"])
    for quote in results:
        writer.writerow([
            quote.get("id", ""),
            quote.get("quote", ""),
            quote.get("author", ""),
            quote.get("category", ""),
            "; ".join(quote.get("tags", []))
        ])

    csv_data = output.getvalue()
    return Response(
        "\ufeff" + csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=famous_quotes.csv"}
    )


@app.route("/api/categories", methods=["GET"])
def get_categories():
    """Return all unique categories with quote counts."""
    category_counts = {}
    for quote in ALL_QUOTES:
        cat = quote.get("category", "General")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    categories = [
        {"name": name, "count": count}
        for name, count in sorted(category_counts.items(), key=lambda x: x[0].lower())
    ]
    return jsonify(categories)


@app.route("/api/authors", methods=["GET"])
def get_authors():
    """Return all unique authors with quote counts."""
    author_counts = {}
    for quote in ALL_QUOTES:
        author = quote.get("author", "Unknown")
        author_counts[author] = author_counts.get(author, 0) + 1

    authors = [
        {"name": name, "count": count}
        for name, count in sorted(author_counts.items(), key=lambda x: x[0].lower())
    ]
    return jsonify(authors)


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
