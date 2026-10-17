import json
import os
import pytest
import sys

# Ensure application directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app, DATA_FILE


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_quote_count_is_100():
    """Verify data file contains exactly 100 quotes."""
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        quotes = json.load(f)
    assert len(quotes) == 100, f"Expected 100 quotes, but found {len(quotes)}"


def test_quote_schema():
    """Verify each quote has valid id, quote text, author, and category."""
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        quotes = json.load(f)

    ids = set()
    for item in quotes:
        assert "id" in item and isinstance(item["id"], int)
        assert item["id"] not in ids, f"Duplicate ID: {item['id']}"
        ids.add(item["id"])

        assert "quote" in item and len(item["quote"].strip()) > 0
        assert "author" in item and len(item["author"].strip()) > 0
        assert "category" in item and len(item["category"].strip()) > 0


def test_index_route(client):
    """Verify root route returns 200 and loads HTML template."""
    response = client.get("/")
    assert response.status_code == 200
    assert b"QuoteVault" in response.data
    assert b"Random Quote" in response.data


def test_get_random_quote(client):
    """Verify /api/quotes/random returns a single valid quote."""
    response = client.get("/api/quotes/random")
    assert response.status_code == 200
    data = response.get_json()
    assert "quote" in data
    assert "author" in data
    assert "category" in data


def test_get_random_quote_filtered_by_category(client):
    """Verify /api/quotes/random respects category filter."""
    response = client.get("/api/quotes/random?category=Science")
    assert response.status_code == 200
    data = response.get_json()
    assert data["category"].lower() == "science"


def test_get_random_quote_filtered_by_author(client):
    """Verify /api/quotes/random respects author filter."""
    response = client.get("/api/quotes/random?author=Einstein")
    assert response.status_code == 200
    data = response.get_json()
    assert "einstein" in data["author"].lower()


def test_get_random_quote_not_found(client):
    """Verify /api/quotes/random returns 404 when no quotes match."""
    response = client.get("/api/quotes/random?category=NonExistentCategory999")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data


def test_get_all_quotes(client):
    """Verify /api/quotes returns all 100 quotes without filters."""
    response = client.get("/api/quotes")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 100
    assert len(data["quotes"]) == 100


def test_search_by_author(client):
    """Verify searching quotes by author."""
    response = client.get("/api/quotes?author=Mandela")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] >= 1
    for q in data["quotes"]:
        assert "mandela" in q["author"].lower()


def test_search_by_category(client):
    """Verify searching quotes by category."""
    response = client.get("/api/quotes?category=Philosophy")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] >= 1
    for q in data["quotes"]:
        assert q["category"].lower() == "philosophy"


def test_search_by_query_text(client):
    """Verify searching quotes by text query."""
    response = client.get("/api/quotes?q=imagination")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] >= 1
    assert any("Einstein" in q["author"] for q in data["quotes"])


def test_get_categories(client):
    """Verify /api/categories returns valid category list and total count equals 100."""
    response = client.get("/api/categories")
    assert response.status_code == 200
    categories = response.get_json()
    assert isinstance(categories, list)
    assert len(categories) > 0

    total_quotes_sum = sum(cat["count"] for cat in categories)
    assert total_quotes_sum == 100


def test_get_authors(client):
    """Verify /api/authors returns valid authors list."""
    response = client.get("/api/authors")
    assert response.status_code == 200
    authors = response.get_json()
    assert isinstance(authors, list)
    assert len(authors) > 0
    total_quotes_sum = sum(auth["count"] for auth in authors)
    assert total_quotes_sum == 100


def test_export_csv(client):
    """Verify /api/quotes/export returns valid CSV file with all quotes."""
    response = client.get("/api/quotes/export")
    assert response.status_code == 200
    assert "text/csv" in response.headers["Content-Type"]
    assert "attachment" in response.headers["Content-Disposition"]
    lines = response.data.decode("utf-8").strip().splitlines()
    # 1 header line + 100 quote rows
    assert len(lines) == 101
    assert "ID,Quote,Author,Category,Tags" in lines[0]


def test_export_csv_filtered(client):
    """Verify /api/quotes/export returns filtered CSV."""
    response = client.get("/api/quotes/export?author=Einstein")
    assert response.status_code == 200
    lines = response.data.decode("utf-8").strip().splitlines()
    assert len(lines) >= 2
    for line in lines[1:]:
        assert "Einstein" in line

