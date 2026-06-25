FROM python:3.12-slim-bookworm

WORKDIR /app

# System deps for WeasyPrint (PDF generation) + PostgreSQL + build tools
RUN apt-get update && apt-get install -y \
    gcc libpq-dev curl \
    # WeasyPrint dependencies
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 libffi-dev shared-mime-info \
    libgirepository1.0-dev gir1.2-pango-1.0 \
    fonts-liberation fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create media directory
RUN mkdir -p /app/media

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
