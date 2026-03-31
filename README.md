# AgriTaxon

**AgriTaxon** is the first benchmark for **open-world taxonomic naming** in agriculture. It tests whether Large Multimodal Models (LMMs) can correctly name a species from its image—without predefined options.

## Highlights

- **7,432 species** across four domains: Crops (1,971), Livestock (178), Pests (3,485), Weeds (1,798)
- Every label linked to **FAO / EPPO** authoritative databases via Wikidata
- Two evaluation protocols: **multiple-choice** (with semantically hard negatives) and **open-ended naming**
- LLM-as-a-Judge scoring with **98% expert agreement**
- 14 LMMs benchmarked, revealing a striking *seeing-without-naming* gap

## Dataset

The dataset is hosted on Hugging Face:

🔗 [Xin1818/AgriTaxon](https://huggingface.co/datasets/Xin1818/AgriTaxon)

## Getting Started

```bash
# Clone this repo
git clone https://github.com/studyzx/AgriTaxon.git
cd AgriTaxon

# Download the dataset
pip install huggingface_hub
huggingface-cli download Xin1818/AgriTaxon --repo-type dataset --local-dir dataset
```

## Citation

```bibtex
@inproceedings{agritaxon2025,
  title     = {AgriTaxon: A Benchmark for Open-World Taxonomic Naming in Agriculture},
  author    = {TODO},
  booktitle = {TODO},
  year      = {2025}
}
```

## License

TODO
