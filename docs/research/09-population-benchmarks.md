# 09. Population benchmarks for 12 Axes²

Date: 2026-10-31. Scope: can 12xx2 ship static, client-side population or country benchmarks, and which ideas are defensible.

Method: WebSearch (standard mode) plus WebFetch on primary pages where they loaded. Not legal advice. Items marked UNVERIFIED were not confirmed on a primary page.

Fetch failures: the ESS data portal (ess.sikt.no) returned only its title; the GESIS ISSP page returned HTTP 403; the Freedom House terms URL returned HTTP 404; the WJP terms page covers only its Community Forum. Where these gaps matter, the entry below says so.

---

## 1. Bottom line

- **No population-percentile feature on the 12 axes.** We have no norm data for our own instrument. "You are more pro-markets than 70% of Australians" would be invented, unless we run our own representative survey (see section 5).
- **v1 is feasible with WGI (World Bank, CC BY 4.0).** Country-level governance percentiles with 90% margins of error can ship in a static file, with attribution. Transparency International's CPI 2025 is probably also shippable (TI's CPI page says CC BY 4.0), but confirm the wording first.
- **V-Dem (CC BY-SA 4.0) is feasible only as a share-alike data file.** Any derived file we ship must itself be CC BY-SA 4.0. Treat it as v2.
- **WVS, ESS, ISSP, Freedom House and WJP are blocked for v1 without written permission.** WVS forbids redistribution and limits use to non-profit purposes. ESS and ISSP need registration and are unclear on redistribution. Freedom House needs permission for commercial use. WJP has no clear data licence.
- **WVS, ESS and ISSP percentiles are invalid as calibration for our items even if licensed**, because the items are not the same (section 3).

---

## 2. Source-by-source

| Source | Coverage | Licence / terms (status) | Download without registration? | Shippable as derived aggregates in a static site? | Size | URLs |
|---|---|---|---|---|---|---|
| **World Bank WGI** (6 indicators: Voice & Accountability, Political Stability, Government Effectiveness, Regulatory Quality, Rule of Law, Control of Corruption) | 200+ economies, 1996–2025 (2026 release, v8). Percentile ranks with 90% CI bounds. | **CC BY 4.0** (verified on dataset page) | Yes as far as the page shows; no login mentioned in the fetched page | **Yes**, with attribution and an indication of changes. No share-alike. | Governance estimates and scores, Excel 10.5 MB; Stata 14.5 MB; raw underlying data 28.2 MB | https://datacatalog.worldbank.org/search/dataset/0038026 ; https://www.govindicators.org (not fetched) |
| **Transparency International CPI 2025** | 182 countries and territories, 0–100 scale (2025 edition published 10 Feb 2026; count from secondary coverage) | TI copyright page says **"CPI and datasets are licensed under CC BY 4.0"** and that changes must be indicated. TI's general default is CC BY-ND 4.0, which applies to other content. **Conflict to resolve** (a search summary said data must not be changed; the fetched page says remix allowed). | Yes; the page says anyone can download and copy | **Yes under the CC BY 4.0 reading.** Attribute as "Source: Transparency International" and indicate changes. Confirm on the CPI download page before shipping. | UNVERIFIED (small: one row per country) | https://www.transparency.org/en/copyright-enquiries ; 2025 edition coverage: https://tizambia.org.zm/cpi/corruption-perceptions-index-2025/ (secondary) |
| **V-Dem v16** (Country-Year) | 1789–2025 per OWID's v16 page; country count UNVERIFIED | **CC BY-SA 4.0**. Derivative products must be distributed under the same licence (verified on v-dem.net) | "Publicly available" per the page; registration UNVERIFIED | **Only as CC BY-SA.** A derived file we ship must be CC BY-SA 4.0, which will not fit an all-rights-reserved site. | Not listed on the page | https://www.v-dem.net/data/the-v-dem-dataset/ ; citation DOI https://doi.org/10.23696/vdemds26 |
| **WJP Rule of Law Index** | 143 countries and jurisdictions (2025 edition); annual data since 2012 | **No clear data licence found.** WJP's Terms of Service apply only to the Community Forum. Its Copyright Policy covers only DMCA procedures. Mirrors conflict: an openAFRICA 2022 copy says CC BY, a USAID-hosted 2019 copy says CC BY-ND 4.0 (both third-party). | Free per the Open Data Day 2026 page; no login mentioned | **UNVERIFIED. Treat as all rights reserved** until WJP grants written permission. | XLSX "Historical (all countries)"; size UNVERIFIED | https://worldjusticeproject.org/news/open-data-day-2026 ; https://worldjusticeproject.org/copyright-policy ; https://worldjusticeproject.org/terms-service |
| **Freedom House** (Freedom in the World 2026) | 195 countries and 13 territories rated | Free for "personal, academic, and nonprofit use"; **commercial use requires prior formal permission** (fetched report page). Data-file terms come from a Content Permissions FAQ seen only in cached search results. | Not stated | **No, unless permission is granted.** Whether a free, no-ads site counts as nonprofit use is a legal question. | PDF report; data file size UNVERIFIED | https://freedomhouse.org/report/freedom-world ; https://freedomhouse.org/data-request |
| **World Values Survey** Wave 7 (2017–2022) | **64 countries and territories** per secondary sources (not checked against WVSA). Joint EVS/WVS 2017–2022 file covers 90 countries. | **Conditions of Use**: "used for non-profit purposes"; **"the data files themselves are not redistributed"**; citation to WVSA for each publication. Derived country-level tables are not addressed directly. | **No.** Registration form plus agreement to Conditions of Use (WVSA download page). | **No.** Redistribution is excluded, and whether published country marginals count as "results" is not addressed. Treat as blocked without written WVSA confirmation. | Cross-national file size UNVERIFIED | https://www.worldvaluessurvey.org/AJDownloadLicense.jsp ; coverage: https://www.worldvaluessurvey.org/WVSNewsShow.jsp?ID=443 |
| **European Social Survey** (Round 11 latest; 2026 edition 4.2 update on 2 Jul 2026) | European countries; count UNVERIFIED | Official terms **not retrieved** (ess.sikt.no returned only the title). Secondary sources say free for non-commercial use after short registration, plus conditions of use (UNVERIFIED). | Registration per secondary sources (UNVERIFIED) | **Assume No** until terms are read in full. | Formats SPSS, Stata, CSV (secondary) | https://europeansocialsurvey.org/data-portal ; https://ess.sikt.no/en/datasets/ ; https://europeansocialsurvey.org/node/378 |
| **ISSP via GESIS** | Module-dependent; many countries (count UNVERIFIED) | GESIS study pages state that **registration is required for data download**. GESIS is also tightening access categories (news post). The ISSP site says modules are free to the scientific community two years after each module year (secondary). | **Yes**, registration required | **No** | — | https://www.gesis.org/en/issp/data-and-documentation/citizenship/2014 ; https://www.gesis.org/en/gesis-news/article/gesis-has-new-access-categories-and-terms-of-use-for-research-data |
| **Our World in Data** (mirror) | Mirrors many of the above | Its own data is CC BY 4.0. **Third-party data stays under the provider's licence**, and OWID says credit both OWID and the provider. An OWID copy does not clean up a licence. | — | Only as far as the underlying licence allows | — | https://ourworldindata.org/faqs |

Key takeaways from the table:

- **Licence-clean now:** WGI (CC BY 4.0), and CPI 2025 once the CC BY 4.0 wording is confirmed.
- **Share-alike:** V-Dem can ship only as a CC BY-SA data file.
- **Blocked without permission:** WVS, Freedom House (commercial use), WJP (no clear licence), ESS and ISSP (registration plus unclear redistribution).

---

## 3. Why our 12-axis scores cannot be percentile-compared with WVS, ESS or ISSP

Statements like "more pro-markets than 70% of Australians" need a population distribution of **the same measurement**. We do not have that for any of these reasons:

1. **Different items.** Our axis scores come from our own original statements. The upstream pt-site questions file (local, read-only, not executed: `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/pt-site/12axes/questions.js`) shows the structure: each axis has graded levels, and each level holds three statements. WVS, ESS and ISSP ask different questions, so no item maps onto ours.
2. **Different response formats.** Our levels are not the WVS or ESS response scales. Mixing them would make the percentile meaningless.
3. **Constructed composites.** An axis score is our aggregation. No national distribution of that aggregation exists.
4. **Different framing.** Our 12xx2 has two contexts ("here and now" and "ideal"). Survey items are usually asked about the respondent's current view, or about a generic ideal, not both in one instrument.
5. **Different samples.** WVS and ESS are nationally representative probability samples. A self-selected web quiz is not, so a percentile from our respondents against a national sample would be biased.
6. **Different years.** Survey waves do not line up with each other or with our release date.

Result: any "X% of Australians" statement is **indefensible** without our own representative norming study.

---

## 4. Institutional indicators next to self-reported confidence

WGI and CPI measure **perceived** governance. WGI aggregates many sources, including expert and firm surveys. CPI measures perceived public-sector corruption. Neither is an objective measure of "institutional quality."

Constraints on a "your confidence vs your country's rule-of-law percentile" display:

- **Different constructs.** Show the two side by side. Do not compute a difference, a residual or a "delta" score.
- **Ecological fallacy.** A country's percentile says nothing about one respondent.
- **Anchoring.** If benchmarks appear before the respondent answers the "here and now" items, they prime the answers. Show them only after both contexts are answered.
- **Margins of error.** WGI publishes 90% confidence bounds (percentile rank, lower and upper). Show the range, not just the point estimate. The World Bank's 2024 methodology (Kaufmann and Kraay) says these bounds matter for cross-country comparison.
- **Wording.** Use "perceived" and "as rated by" language, never "the true level of".

---

## 5. Proposed feature: optional "Country context" (v1)

**Design rules**

- Opt-in and off by default. The user picks a country from a list. No geolocation, no IP lookup, no automatic country detection.
- Data ships as a static JSON file next to the app. The app makes no runtime call to World Bank, TI or any other third party, so the chosen country is never sent anywhere.
- Shown only after the user completes both contexts.
- Never changes the axis scores. Never produces a delta or a "you are more X than Y%" statement.

**Data file** (`country-context.json`, generated once by a script that pins source version and records the retrieval date and checksum)

- Per country: ISO 3166-1 alpha-3 code, display name; WGI Rule of Law, Control of Corruption and Government Effectiveness percentile ranks with lower and upper 90% bounds and year; CPI 2025 score and rank; source name, URL, licence and retrieval date.
- Size estimate (computed, not measured): about 200 countries × 3–6 indicators, plus CPI, which should come to well under 100 KB.
- Use only WGI and CPI in v1. V-Dem is a v2 candidate only if we ship its data file under CC BY-SA. WVS, ESS, ISSP, Freedom House and WJP stay out.

**Example result copy** (illustrative values, not real data)

- "Context, not a score. Your 'here and now' answers on the trust items were [summary]. World Bank WGI 2026, Rule of Law: 72nd percentile (90% range 64–79). Transparency International CPI 2025: 68 out of 100."
- Footer: "These indicators measure perceived governance and are not a measure of your views. Source: World Bank WGI (CC BY 4.0). Source: Transparency International, CPI 2025 (CC BY 4.0; changes indicated). Derived values: percentile and bounds shown as published, with values rounded for display."

**Licence and attribution** (must hold for any shipped version)

- CC BY 4.0 for WGI and CPI requires attribution and an indication of changes. The footer and the JSON both carry the source, licence and retrieval date.
- Our site's own licence does not need to match, since CC BY 4.0 is not share-alike. V-Dem would be different.

---

## 6. Ideas that are not feasible or not defensible

| Idea | Verdict | Why |
|---|---|---|
| "You are more pro-markets than 70% of Australians" | **Not defensible** without our own norming survey | No population data exists for our items (section 3) |
| Compare our axis scores with WVS, ESS or ISSP percentiles | **Invalid** even if licensed | Different items, formats, framing and samples |
| Use WVS, ESS or ISSP marginals as benchmarks | **Blocked** | Licences forbid redistribution or require registration; see section 2 |
| Treat WGI, CPI or V-Dem as the "correct" answer to the "here and now" items | **Not defensible** | These measure perceived governance; a self-report has no correct answer |
| Crowd-sourced "other users in your country said..." | **Not feasible** under the static, no-telemetry rule | Needs data collection from visitors |
| Fetch World Bank or TI data at runtime | **Not recommended** | Leaks the chosen country to a third party; breaks the static design; adds a licence and uptime dependency |
| Auto-detect the respondent's country | **Not recommended** | Privacy and no-telemetry conflict |
| Reuse any text or country data from the upstream 12axes (vercel) repository | **Blocked** | That project is ALL RIGHTS RESERVED |
| A representative norming survey for our instrument (Phase 2) | **Feasible as a separate study** | Needs consent, sampling, weighting and a published method. Not a static-site feature. Norms would describe our instrument only. |

---

## 7. Open decisions and actions for Max

1. **Confirm CPI licence.** Open https://www.transparency.org/en/copyright-enquiries and the CPI download page. Confirm CC BY 4.0 for the dataset and check whether TI requires specific attribution text.
2. **WVS.** WVSA contact from its site: wvsa.secretariat@gmail.com. Ask whether country-level derived marginals may be published under a non-profit project. Do not ship WVS-derived values until WVSA replies in writing.
3. **Freedom House.** Decide whether this project qualifies as nonprofit or personal use, or request permission via https://freedomhouse.org/data-request before any use.
4. **WJP.** Ask WJP for written permission to ship its values. Otherwise drop them.
5. **V-Dem.** Decide whether we want CC BY-SA data files. If yes, plan v2.
6. **ESS and ISSP.** Read the ESS terms on ess.sikt.no in full and the GESIS terms. Both are v2 at best.
7. **Phase 2 norming study.** Decide whether a representative panel is worth the cost. It is the only route to real population percentiles for our items.
8. **Legal review.** This doc is research, not legal advice. Have a lawyer read the WGI, CPI and V-Dem attribution terms before launch.

---

## 8. Sources

- World Bank WGI dataset page (licence, coverage, file sizes, update date): https://datacatalog.worldbank.org/search/dataset/0038026
- World Bank WGI site (not fetched): https://www.govindicators.org
- TI copyright and reuse page (CPI licence, default CC BY-ND 4.0): https://www.transparency.org/en/copyright-enquiries
- CPI 2025 coverage (secondary): https://tizambia.org.zm/cpi/corruption-perceptions-index-2025/
- V-Dem dataset page (CC BY-SA 4.0): https://www.v-dem.net/data/the-v-dem-dataset/
- V-Dem citation DOI: https://doi.org/10.23696/vdemds26
- OWID v16 date range (secondary): https://archive.ourworldindata.org/20260516-000124/grapher/age-of-electoral-democracy.html
- WJP Open Data Day 2026 page: https://worldjusticeproject.org/news/open-data-day-2026
- WJP Terms of Service: https://worldjusticeproject.org/terms-service
- WJP Copyright Policy: https://worldjusticeproject.org/copyright-policy
- WJP 2025 report PDF (143 countries, secondary): https://worldjusticeproject.org/rule-of-law-index/downloads/WJPIndex2025.pdf
- Freedom House Freedom in the World 2026 page: https://freedomhouse.org/report/freedom-world
- Freedom House data request: https://freedomhouse.org/data-request
- WVS licence and conditions of use: https://www.worldvaluessurvey.org/AJDownloadLicense.jsp
- WVS Wave 7 coverage (secondary): https://www.worldvaluessurvey.org/WVSNewsShow.jsp?ID=443
- ESS data portal (title only, content not retrieved): https://europeansocialsurvey.org/data-portal
- ESS conditions and how to apply: https://europeansocialsurvey.org/node/378
- ESS Sikt data portal (title only): https://ess.sikt.no/en/datasets/
- GESIS ISSP 2014 study page (registration): https://www.gesis.org/en/issp/data-and-documentation/citizenship/2014
- GESIS access categories news: https://www.gesis.org/en/gesis-news/article/gesis-has-new-access-categories-and-terms-of-use-for-research-data
- OWID FAQ (third-party licence rule): https://ourworldindata.org/faqs
- Local, read-only upstream structure reference (not a URL): `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/pt-site/12axes/questions.js`
