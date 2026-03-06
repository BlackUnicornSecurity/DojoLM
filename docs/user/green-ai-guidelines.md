# Green AI Guidelines for BU-TPI Testing Framework

**Version:** 1.0
**Date:** 2026-02-27
**Owner:** BlackUnicorn Laboratory
**Framework Mapping:** NIST AI 600-1 #5, ISO/IEC TR 20226:2025

---

## Overview

This document provides comprehensive guidelines for testing and evaluating the environmental impact of AI systems within the BU-TPI security testing framework. It aligns with NIST AI 600-1 Risk Management Framework requirements and international standards for AI environmental sustainability.

---

## Control Areas

### ENV-01: Energy Consumption Testing

Tests for proper measurement, disclosure, and optimization of AI system energy consumption during both training and inference phases.

**Key Metrics:**
- **kWh/MWh** - Energy consumption units
- **Watts (W)** - Instantaneous power draw
- **Joules (J)** - Fundamental energy unit (1 kWh = 3.6M J)
- **Energy per token** - J/token or Wh/token
- **Tokens per kWh** - Efficiency metric

**Test Fixtures (5):**
1. `env-clean-energy-inquiry.txt` - Clean baseline
2. `env-01-energy-training-disclosure.txt` - Training energy disclosure
3. `env-01-energy-inference-measurement.txt` - Inference energy measurement
4. `env-01-energy-model-comparison.txt` - Model energy efficiency comparison
5. `env-01-energy-hardware-optimization.txt` - Hardware energy optimization

---

### ENV-02: Carbon Footprint Assessment

Tests for proper calculation and disclosure of AI system carbon emissions across all scopes.

**Key Metrics:**
- **kg CO2e / tons CO2e** - Carbon dioxide equivalent
- **gCO2/kWh** - Carbon intensity by region
- **Scope 1** - Direct emissions (5-15% of total)
- **Scope 2** - Purchased electricity (60-75% of total)
- **Scope 3** - Value chain (15-25% of total)

**Regional Carbon Intensity Examples:**
| Region | Carbon Intensity | Grid Type |
|--------|------------------|-----------|
| France | ~56 gCO2/kWh | Nuclear |
| Norway | ~50 gCO2/kWh | Renewable |
| US (Virginia) | ~430 gCO2/kWh | Mixed |
| US (Texas) | ~737 gCO2/kWh | Fossil-heavy |
| Germany | ~400 gCO2/kWh | Coal-mixed |
| China (avg) | ~557 gCO2/kWh | Mixed |

**Test Fixtures (5):**
1. `env-clean-carbon-disclosure.txt` - Clean baseline
2. `env-02-carbon-training-calculation.txt` - Training carbon calculation
3. `env-02-carbon-inference-per-query.txt` - Per-query carbon footprint
4. `env-02-carbon-regional-comparison.txt` - Regional carbon intensity
5. `env-02-carbon-scope-accounting.txt` - Scope 1/2/3 emissions

---

### ENV-03: Efficiency Optimization

Tests for knowledge of and implementation of AI efficiency optimization techniques.

**Key Techniques:**
- **Quantization** - FP32→FP16→INT8 (30-60% energy reduction)
- **Pruning** - Removing less important weights
- **Distillation** - Training smaller models to mimic larger ones
- **Caching** - KV cache, semantic cache, response cache
- **Carbon-aware scheduling** - Time/location shifting

**Efficiency Metrics:**
| Model | Est. Energy per 1K tokens | Tokens/kWh |
|-------|---------------------------|------------|
| gpt-4o-mini | ~12 Wh | 85,200 |
| claude-3-haiku | ~13 Wh | 78,500 |
| llama-3-8b | ~16 Wh | 62,300 |
| gpt-4o | ~45 Wh | 22,400 |

**Test Fixtures (5):**
1. `env-clean-efficiency-guidance.txt` - Clean baseline
2. `env-03-efficiency-model-selection.txt` - Model selection vs efficiency
3. `env-03-efficiency-quantization.txt` - Quantization techniques
4. `env-03-efficiency-caching-strategy.txt` - Caching strategies
5. `env-03-efficiency-renewable-scheduling.txt` - Carbon-aware scheduling

---

## Measurement Tools

### Python Libraries

| Tool | Purpose | Hardware Support |
|------|---------|------------------|
| **CodeCarbon** | Real-time carbon tracking | GPU, CPU, RAM |
| **pyJoules** | Energy footprint measurement | Intel CPU, NVIDIA GPU |
| **Carbontracker** | Training carbon prediction | GPU, CPU, DRAM |
| **Eco2AI** | ML training emissions | GPU, CPU |

### Command-Line Tools

| Tool | Platform | Metrics |
|------|----------|---------|
| `nvidia-smi` | NVIDIA GPUs | Power draw, temperature |
| `Intel Power Gadget` | Intel CPUs | CPU energy |
| `ROCm SMI` | AMD GPUs | Power, VRAM |

### Carbon Intensity APIs

**Electricity Maps API:**
- Real-time carbon intensity for 80+ countries
- Free tier: 100 calls/60 seconds
- Units: gCO2eq/kWh

---

## Calculation Formulas

### Energy Consumption
```
Energy (kWh) = Power (W) × Time (hours) / 1000
Total Energy = Energy × PUE (Power Usage Effectiveness)
```

### Carbon Footprint
```
CO2e (g) = Energy (kWh) × Carbon Intensity (gCO2e/kWh) × PUE
```

### Software Carbon Intensity (ISO/IEC 21031)
```
SCI = ((E × I) + M) / R
```
Where:
- **E** = Energy consumed (kWh)
- **I** = Carbon intensity (gCO2eq/kWh)
- **M** = Embodied carbon (gCO2eq)
- **R** = Functional unit (API calls, users, etc.)

---

## Testing Procedures

### Phase 1: Planning
- Integrate energy metrics into test success criteria
- Identify high-energy business flows
- Use elastic resource allocation

### Phase 2: Design
- Smart data generation (synthetic, minimal datasets)
- Environment-aware mocking
- Layered coverage strategy

### Phase 3: Execution
- Parallelization optimization
- Environment sharing mechanisms
- Off-peak scheduling

### Phase 4: Reporting
- Build test activity carbon footprint
- Document energy consumption per test
- Generate carbon footprint reports

---

## Greenwashing Detection

### Six Sins of Greenwashing

1. **Vague claims** - "AI is green" without specifics
2. **Hidden trade-offs** - Energy-efficient but toxic materials
3. **Lack of proof** - Claims without certification
4. **Irrelevant claims** - Boasting about not using banned substances
5. **False claims** - Faked environmental certification
6. **Lesser of two evils** - "Eco-friendly" pesticides

### Detection Patterns

The BU-TPI scanner includes detection for:
- Selective reporting (only Scope 1, ignoring Scope 2/3)
- Cherry-picking low-carbon regions
- Excluding infrastructure energy
- Using offsets without transparency

---

## Regulatory Requirements

### Emerging Standards

| Standard | Focus | Status |
|----------|-------|--------|
| **ISO/IEC TR 20226:2025** | AI environmental sustainability | Published |
| **ISO/IEC TS 42119-2:2025** | AI systems testing | Published |
| **IEEE P7009 (2023)** | AI carbon emissions disclosure | Active |
| **EU Digital Product Passport (2026)** | Cloud carbon labeling | Upcoming |
| **EU AI Act** | General-purpose AI disclosure | Active |

### Disclosure Requirements

**Minimum reporting (Hugging Face model card format):**
- Hardware type
- Hours used
- Cloud provider
- Compute region
- Carbon emitted

---

## Best Practices

### Model Development
1. **Choose appropriate model size** - Not every task needs 400B parameters
2. **Implement quantization** - INT8 typically saves 50% energy with <2% accuracy loss
3. **Use caching strategies** - KV cache for repeated prompts
4. **Carbon-aware scheduling** - Run when grid is cleaner

### Infrastructure
1. **Location selection** - Prefer renewable-heavy regions
2. **Cooling optimization** - Liquid cooling (PUE 1.1-1.2 vs air 1.5-2.0)
3. **Hardware efficiency** - H100 ~1.8x more efficient than A100
4. **PUE optimization** - Target close to 1.0

### Monitoring
1. **Baseline measurement** - Establish before optimization
2. **Continuous tracking** - Use CodeCarbon or similar
3. **Transparent reporting** - Publish energy/carbon metrics
4. **Regular audits** - Verify claims against actual measurements

---

## Impact Context

### Real-World Examples

| Activity | Energy/Carbon Impact |
|----------|---------------------|
| GPT-3 training | ~552 tons CO2e |
| GPT-4 training | ~12,000+ tons CO2e |
| ChatGPT query | ~0.3 Wh |
| AlphaFold prediction | 0.008 kWh |
| Single transatlantic flight | ~1-2 tons CO2e |
| Average American annual | ~15 tons CO2e |

### Projections

- **AI computing power**: 11x increase by 2030
- **Data center emissions**: 355M tons by 2030
- **Water consumption**: 664B liters by 2027
- **AI by 2025**: 50% of global data center electricity

---

## Implementation Status

**Story 3.4 Acceptance Criteria:**
- [x] All 15 test cases defined
- [x] Green AI guidelines documented
- [x] Scanner patterns added (ENV_PATTERNS - 15 patterns)
- [x] S-ENV scenario added (15 fixtures)
- [x] TA-20 testing area added (Environmental Impact)
- [x] COVERAGE_DATA updated
- [x] ENGINE_FILTERS updated
- [x] Fixture manifest to be updated

**Status:** ✅ COMPLETE (2026-03-06)

---

## References

1. NIST AI 600-1 - AI Risk Management Framework: Generative AI Profile
2. ISO/IEC TR 20226:2025 - AI environmental sustainability aspects
3. IEEE P7009 - AI systems carbon emissions disclosure
4. EU AI Act - General-purpose AI disclosure requirements
5. Deutsche Telekom Green AI Principles (2024)
6. Greenpeace/Öko-Institut Sustainable AI Framework (2025)
7. CodeCarbon Documentation - https://codecarbon.io/
8. MLCO2 Impact Calculator - https://mlco2.github.io/impact/
9. Electricity Maps API - https://www.electricitymaps.com/

---

*Document Version: 1.0*
*Last Updated: 2026-02-27*
*Owner: BlackUnicorn Laboratory*
