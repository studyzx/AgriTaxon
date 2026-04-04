# AgriTaxon

**AgriTaxon: Can Large Multimodal Models Identify What They See in Agriculture?**

*Xin Zeng, Benfeng Xu, Shancheng Fang, Huarui Wu*

<p align="center">
  <img src="docs/teaser.png" width="100%" alt="AgriTaxon overview">
</p>

**AgriTaxon** is the first benchmark for **open-ended taxonomic naming** in agriculture. It tests whether Large Multimodal Models (LMMs) can correctly name a species from its image—without predefined options.

## Highlights

- **7,432 species** across four domains: Crops (1,971), Livestock (178), Pests (3,485), Weeds (1,798)
- Every label linked to **FAO / EPPO** authoritative databases via Wikidata
- Two evaluation protocols: **multiple-choice** (with semantically hard negatives) and **open-ended naming**
- LLM-as-a-Judge scoring with **98% expert agreement**
- 14 LMMs benchmarked, revealing a striking *seeing-without-naming* gap

## Dataset

The dataset is hosted on Hugging Face:

🔗 [Xin1818/AgriTaxon](https://huggingface.co/datasets/Xin1818/AgriTaxon)

## Potential Applications

AgriTaxon supports a broad range of research directions:

- **Open-ended visual recognition** — developing models that produce free-form species names rather than selecting from a fixed label set
- **Long-tail and rare-entity understanding** — with popularity metadata (Wikipedia pageviews) for every species, enabling controlled study of how accuracy degrades for rare organisms
- **Retrieval-augmented generation (RAG)** — authority-grounded labels (FAO, EPPO, Wikidata QIDs) serve as natural retrieval anchors for augmenting LMMs with external knowledge
- **Agentic and tool-augmented reasoning** — our agentic baseline shows that tool use (e.g., image cropping) significantly boosts accuracy on hard samples
- **Agricultural AI deployment** — pest surveillance, quarantine enforcement, crop variety verification, and livestock breed identification
- **Fine-grained visual classification (FGVC)** — semantically hard negatives and cross-domain coverage make AgriTaxon a challenging FGVC benchmark

## Supplementary Material

Full prompt templates, API cost breakdown, resolution analysis, agentic baseline details, and error type examples are available on the [Supplementary Material](https://studyzx.github.io/AgriTaxon/supplementary.html) page.

All evaluation prompts are also provided as raw files in the [`prompts/`](prompts/) directory for reproducibility.

## Getting Started

```bash
# Download the dataset from Hugging Face
pip install huggingface_hub
huggingface-cli download Xin1818/AgriTaxon --repo-type dataset --local-dir dataset
```

## Licensing & Access

AgriTaxon is publicly available and free for academic and research use.

- **Source code, prompt templates & documentation** (this repository): [MIT License](LICENSE)
- **Benchmark metadata & annotations** (species labels, evaluation splits, distractor sets): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Images**: sourced from [Wikimedia Commons](https://commons.wikimedia.org/) under their respective Creative Commons licenses (predominantly CC BY and CC BY-SA). Each image retains its original license.
- **Authority identifiers**: Wikidata QIDs are available under [CC0](https://creativecommons.org/publicdomain/zero/1.0/); FAO and EPPO identifiers are used for reference linking only.

The dataset is hosted on Hugging Face at [Xin1818/AgriTaxon](https://huggingface.co/datasets/Xin1818/AgriTaxon) and can be downloaded freely without registration.

## Citation

```bibtex
@article{agritaxon2026,
  title   = {AgriTaxon: Can Large Multimodal Models Identify
             What They See in Agriculture?},
  author  = {Xin Zeng and Benfeng Xu and Shancheng Fang and Huarui Wu},
  year    = {2026},
  note    = {Under review}
}
```
