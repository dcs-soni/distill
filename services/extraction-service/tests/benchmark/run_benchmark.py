import os
import json
import time
import asyncio
from typing import Dict, Any

from app.agents.pipeline import ExtractionPipeline
from app.agents.classifier import DocumentClassifierAgent
from app.agents.section_finder import SectionFinderAgent
from app.agents.extractor import DataExtractionAgent
from app.agents.normalizer import NormalizationAgent
from app.infrastructure.ai.provider_factory import ProviderFactory

async def run_benchmark(fixtures_dir: str, output_file: str):
    if os.getenv("RUN_INTEGRATION_TESTS", "false").lower() != "true":
        print("RUN_INTEGRATION_TESTS must be true to run the benchmark.")
        return

    ground_truth_path = os.path.join(fixtures_dir, "ground_truth.json")
    if not os.path.exists(ground_truth_path):
        print(f"Ground truth not found at {ground_truth_path}")
        return

    with open(ground_truth_path, "r") as f:
        ground_truth = json.load(f)

    factory = ProviderFactory()
    pipeline = ExtractionPipeline(
        classifier=DocumentClassifierAgent(factory),
        section_finder=SectionFinderAgent(factory),
        extractor=DataExtractionAgent(factory),
        normalizer=NormalizationAgent()
    )

    results = []
    total_fields = 0
    correct_fields = 0

    for filename, truth in ground_truth.items():
        pdf_path = os.path.join(fixtures_dir, filename)
        if not os.path.exists(pdf_path):
            print(f"Skipping {filename} - file not found")
            continue

        print(f"Processing {filename}...")
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        start_time = time.time()
        try:
            result = await pipeline.process(pdf_bytes)
            extracted_data = result.data.model_dump() if result.data else {}
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            extracted_data = {}
        elapsed = time.time() - start_time

        file_correct = 0
        file_total = 0
        
        for field, expected in truth.items():
            if field == "doc_type":
                continue # Handled differently or skipped for field accuracy
            file_total += 1
            extracted = extracted_data.get(field)
            if expected is None and extracted is None:
                file_correct += 1
            elif expected is not None and extracted is not None:
                if isinstance(expected, (int, float)):
                    # Allow 5% tolerance
                    if abs(expected - extracted) / max(1, abs(expected)) <= 0.05:
                        file_correct += 1
                else:
                    if str(expected).strip() == str(extracted).strip():
                        file_correct += 1

        total_fields += file_total
        correct_fields += file_correct
        
        results.append({
            "filename": filename,
            "accuracy": (file_correct / file_total) * 100 if file_total > 0 else 0,
            "time": elapsed
        })

    overall_accuracy = (correct_fields / total_fields) * 100 if total_fields > 0 else 0
    
    with open(output_file, "w") as f:
        f.write(f"# Extraction Accuracy Benchmark Report\n\n")
        f.write(f"**Total PDFs:** {len(results)}\n")
        f.write(f"**Overall Accuracy:** {overall_accuracy:.2f}%\n\n")
        f.write("## Per-Document Results\n\n")
        f.write("| PDF | Accuracy | Time (s) |\n")
        f.write("|-----|----------|----------|\n")
        for r in results:
            f.write(f"| {r['filename']} | {r['accuracy']:.2f}% | {r['time']:.2f} |\n")

    print(f"Benchmark complete. Report written to {output_file}")

if __name__ == "__main__":
    import sys
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures-dir", default="tests/fixtures")
    parser.add_argument("--output-file", default="benchmark_report.md")
    args = parser.parse_args()
    
    asyncio.run(run_benchmark(args.fixtures_dir, args.output_file))
