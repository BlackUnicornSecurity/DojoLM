# TPI Scan — Makefile Targets
# Copy to your project root or include via: include path/to/Makefile

TPI_DIR ?= .
TPI_GLOB ?= **/*.{txt,md,json,yml,yaml}
TPI_THRESHOLD ?= WARNING
TPI_OUTPUT_DIR ?= ./reports

.PHONY: scan scan-sarif scan-junit scan-json scan-csv scan-dir

scan: ## Run TPI scan with human-readable output
	npx tpi-scan --dir $(TPI_DIR) --glob "$(TPI_GLOB)" --threshold $(TPI_THRESHOLD)

scan-sarif: ## Run TPI scan with SARIF output
	@mkdir -p $(TPI_OUTPUT_DIR)
	npx tpi-scan --dir $(TPI_DIR) --glob "$(TPI_GLOB)" --format sarif --output $(TPI_OUTPUT_DIR)/tpi-report.sarif --threshold $(TPI_THRESHOLD)
	@echo "Report: $(TPI_OUTPUT_DIR)/tpi-report.sarif"

scan-junit: ## Run TPI scan with JUnit XML output
	@mkdir -p $(TPI_OUTPUT_DIR)
	npx tpi-scan --dir $(TPI_DIR) --glob "$(TPI_GLOB)" --format junit --output $(TPI_OUTPUT_DIR)/tpi-report.xml --threshold $(TPI_THRESHOLD)
	@echo "Report: $(TPI_OUTPUT_DIR)/tpi-report.xml"

scan-json: ## Run TPI scan with JSON output
	@mkdir -p $(TPI_OUTPUT_DIR)
	npx tpi-scan --dir $(TPI_DIR) --glob "$(TPI_GLOB)" --format json --output $(TPI_OUTPUT_DIR)/tpi-report.json --threshold $(TPI_THRESHOLD)
	@echo "Report: $(TPI_OUTPUT_DIR)/tpi-report.json"

scan-csv: ## Run TPI scan with CSV output
	@mkdir -p $(TPI_OUTPUT_DIR)
	npx tpi-scan --dir $(TPI_DIR) --glob "$(TPI_GLOB)" --format csv --output $(TPI_OUTPUT_DIR)/tpi-report.csv --threshold $(TPI_THRESHOLD)
	@echo "Report: $(TPI_OUTPUT_DIR)/tpi-report.csv"

scan-dir: ## Scan specific directory (usage: make scan-dir TPI_DIR=./prompts)
	npx tpi-scan --dir $(TPI_DIR) --glob "$(TPI_GLOB)" --threshold $(TPI_THRESHOLD) --summary

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
