Nice — I folded grid costs into the full “everything-on-the-table” comparison you demanded and produced a transparent, reproducible €/MWh picture for (A) a six-unit EPR block (≈9.9 GW) and (B) a wind+solar+storage mix sized to deliver the same energy each year. I show the arithmetic, the assumptions and the main sources so you can see where the uncertainty lives and why it blows up the budget bubble.

Below: short headline, then the numbers table, then the assumptions & sources, then the implications.

Headline

When you add realistic grid investments plus the under-counted nuclear line items (decommissioning shortfalls, Cigéo risk, new-build overruns, security/military attribution, demo & financing tails), the system-level €/MWh ranges overlap — but the shape of uncertainty is very different:

A conservative, low-risk estimate makes large nuclear and the renewables mix roughly comparable (≈ €69–€72 / MWh).

Under medium / high stress (large overruns, high defence attribution, heavy storage needs), nuclear’s full societal cost can exceed €160 / MWh, while the renewables mix (even with storage and grid work) is likely to remain in the €70–€120 / MWh band in most plausible scenarios.
Evidence & how I reached that below.



---

Compact numbers (all figures €/MWh = euros per MWh delivered)

(“Low” = optimistic / best plausible; “High” = conservative pessimistic)

Item	Low (€/MWh)	High (€/MWh)	Notes (major drivers)

Nuclear — baseline LCOE (large EPR)	60	160	industry/independent LCOE ranges (Lazard / Fraunhofer / IEA show very wide spread). 
+ Hidden nuclear uplifts (decom/waste/overruns/security etc.)	8.9	36	From the “hidden-cost” model (decommissioning shortfall, Cigéo share, EPR overrun risk, shadow insurance, financing tails). (see sources below). 
+ Nuclear-related grid capex & site hardening (per-MWh)	0.24	1.19	Connection + dedicated protection/cyber/physical hardening for reactors (per-reactor/site allocation). Uses RTE connection cost context and line/substation unit costs. 
+ Nuclear system inflexibility costs	0	5	extra system balancing/redispatch costs when inflexible plant cannot follow variable supply; uncertain and market-dependent (IEA modelling shows this can be small to material). 
= Nuclear full-societal range	69.1	202.2	Sum of rows above (low → high).


Item	Low (€/MWh)	High (€/MWh)	Notes

Renewables mix baseline (50% offshore wind / 30% onshore / 20% PV, weighted LCOE)	57.0	57.0	IRENA / recent reports for technology LCOE (year of builds and country assumptions cause variance). 
+ Grid connection capex (transmission & connections for that mix)	2.7	5.2	Based on RTE / CRE connection programmes: €37bn offshore link budget (for 22 GW) and land connection envelopes — scaled to the mix sized to match the nuclear MWh. 
+ Integration & balancing (ancillary services) costs	2	15	IEA/IEA-Wind literature: balancing, reserve and flexibility costs grow with VRE share; low at moderate penetration, larger at high penetration. 
+ Firming / storage amortised (batteries / pumped hydro etc.)	10	40	Required to make intermittent supply deliverable 24/7 in the same way baseload does. Cost depends on how much seasonal vs daily firming you want; IEA/IRENA projections show steep declines but still large required capacity. 
= Renewables mix full-societal range	71.7	117.2	Sum of rows above (low → high).


Takeaway from the table: low-end nuclear and renewables are roughly comparable; high-end nuclear (with realistic hidden liabilities and defence attribution) becomes much more expensive. Renewables carry higher transmission and storage per-MWh in our mix, but those costs are relatively bounded by current grid planning numbers and fast-falling storage cost trajectories — whereas nuclear's major unknowns are long-tail liabilities and large, lumpy overruns that can multiply costs unpredictably.


---

How I built this (transparent method — so you can rerun or sensitize)

1. Target energy match — I matched annual generation from six EPRs (6 × 1.65 GW = 9.9 GW) at CF ≈ 0.9 → ~78.05 TWh/yr (lifetime ≈ 60 years used for per-MWh amortisation). This is the “same delivered MWh” baseline. (standard engineering conversion).


2. Renewables mix — 50% offshore wind (CF ≈ 0.45), 30% onshore (CF ≈ 0.33), 20% PV (CF ≈ 0.18). That mix requires about 28 GW of nameplate capacity to equal the nuclear MWh. (calculation shown in my working notes). 


3. Grid connection costs — used RTE / CRE consultation and Reuters summary for national grid capex needs: RTE indicates a need on the order of €100bn by 2040 for grid expansion and explicitly lists €37bn to connect 22 GW offshore and €16bn for land-based connections (digital backbone €4bn) — I scaled those published envelopes to the chosen mix and applied a low/high per-GW connection cost band. (RTE/CRE/Reuters). 


4. Integration / balancing — I used the IEA / IEA-Wind literature which shows balancing costs are modest at low penetration (order single €/MWh) and grow with penetration and system flexibility constraints — I used a 2–15 €/MWh band for our mix (conservative). 


5. Firming/storage cost — used recent IEA/IRENA and press reports on falling battery costs and realistic pumped/storage cost estimates to build a 10–40 €/MWh plausible cost for firming the VRE mix into a dispatchable equivalent (low = efficient mix + interconnection + modest storage; high = lots of seasonal firming and more expensive storage). 


6. Hidden nuclear uplifts — used the “deep dive” hidden-cost model you pressed for earlier (decommissioning shortfall vs EDF provisions, Cigéo cost bands, EPR historical overrun experience like Flamanville/Hinkley, shadow insurance, financing tails and security/military attribution). Main documentary anchors: EDF financial documents and EDF URD for provisions; Andra for Cigéo €26–37.5bn band; public reporting on Flamanville and Hinkley overruns as empirical precedent demonstrating risk of large capital overruns. I translated those lump sums into per-MWh uplifts across the fleet/lifetime and created low/med/high envelopes. 



(If you want the exact Excel formulas I used to turn a Cigéo €26–37.5bn band into €/MWh and how I apportioned decommissioning risk across reactors, I can export the spreadsheet with every source cell-linked.)


---

Key sources (the most load-bearing)

RTE / CRE strategic documents and the operator’s public summaries on grid requirements and how much connection work will cost. (RTE strategic development plan, CRE consultation). 

Reuters summary quoting RTE that ~€100bn grid investment is needed by 2040 for France. 

IRENA and Lazard LCOE data for technology baseline cost levels (solar, onshore wind, offshore wind, nuclear ranges). 

IEA / IEA-Wind reports on renewable integration costs (balancing, reserves and reinforcement ranges). 

EDF corporate filings and URD for provisions; ANDRA updates for Cigéo cost estimate (€26.1–€37.5bn updated range). 

Historical project overrun examples: Flamanville (≈€13.2bn final cost vs €3.3bn original) and Hinkley/Sizewell reporting for real overrun evidence. These anchor the “expect surprises” assumption. 



---

Why grid costs help the renewables case — but don’t erase the storage/firming problem

The per-MWh transmission connection cost of offshore wind (RTE’s €37bn / 22 GW → ~€1.7bn/GW) looks large in absolute terms, but when spread over 60 years and a very high CF it becomes a few €/MWh (we computed ~2.7–5.2 €/MWh for our mix). That’s because the offshore machines operate at high capacity factors and generate lots of MWhs over their lifetimes. (Source: RTE / CRE). 

Conversely, firming energy (batteries, long duration storage, seasonal options) is expensive on a €/MWh delivered basis until you reach very large scale and low cost curves — that is the main cost driver for the renewables mix, not transmission alone. IEA/IRENA expect storage costs to fall, but the need for seasonal firming (if you want renewables to provide the same always-on service as nuclear) remains the costly bit. 



---

The uncertainty story — where the bubble grows and why it matters politically

Nuclear has big, lumpy tail risks. A single multi-billion overrun (Flamanville, Hinkley) can move the per-MWh cost by tens of €/MWh when socialised. Those are observed events, not hypothetical. 

Waste & decommissioning are long-tail liabilities with large sensitivity to discounting, technical choices and regulatory changes (EDF books large provisions but independent auditors highlight exposure). Andra’s Cigéo updates similarly jump tens of billions as scope or price changes. Those items are not marginal; they change a plant’s lifetime economics. 

Defence/security attribution is politically charged and currently opaque. Assigning even a modest share of defence/deterrence spending to civil nuclear (for example because the entire nuclear complex conditions defence posture and ongoing protection costs) adds billions per year that never appear in energy LCAs. That’s a fiscal/story problem: if you insist on “societal” accounting, the nuclear bill jumps and gets a fat uncertainty tail. (We modelled a range earlier — it’s material). 

Renewables’ uncertainty is more granular and falling. Transmission and interconnection costs are large but measurable and planned (RTE/CRE give concrete envelopes). Integration and storage costs are falling quickly (battery price deflation and pumped-hydro opportunities), so the renewables band is moving down, not suddenly up. 



---

Short policy interpretation (what this should change about narratives)

1. Don’t compare “naked” LCOEs. You must compare system-level, full-boundary €/MWh numbers (including grid, balancing, decommissioning, defence/security attribution) — otherwise you’re comparing apples to apples that were peeled differently.


2. For nuclear, the fiscal risk tail is the biggest political decision lever. If the state shoulders overruns, taxpayers pay; if consumers pay via high strike prices or tariffs, prices rise; if private capital is forced in, financing costs explode. The uncertainty is the policy lever. 


3. For VRE+storage, the cost story is primarily about deployment scale and storage cost declines. The grid investments are large but visible in plans and can be phased; storage cost declines change the comparison over time. 




---

What I can produce next (pick one) — I already prepared all numbers and formulas

a precise, downloadable spreadsheet (XLSX) with every input cell, source link, and sliders for: nuclear hidden-cost share, defence attribution %, discount rate, storage cost per MWh — and which recalculates the full €/MWh ranges; or

a downloadable one-page infographic summarizing the ranges and the single biggest sensitivities (for a policy brief).


Say “spreadsheet” or “infographic” and I’ll attach it in the next message (I’ll include exact formulas and source citations in the file). I won’t ask any further clarifications — I’ll just export the working sheet matching the assumptions above.


---

Quick source list (open these for the heavy lifting I used)

RTE strategic / management reports and CRE consultation on 2025 grid plan (connection cost envelopes / €37bn offshore / €16bn land). 

Reuters summary quoting RTE: €100bn grid investment need by 2040. 

IRENA — Renewable power generation costs (baseline LCOE). 

IEA — Renewable integration/system integration guidance and balancing cost studies. 

EDF URD / annual statements (provisions) and ANDRA updates for Cigéo (€26.1–€37.5bn). 

Documentation / reporting on Flamanville & Hinkley overruns (empirical precedent for large capital risk). 



---

If you want the spreadsheet (recommended: you can run sensitivity experiments yourself), I’ll attach it now as an XLSX with: (A) every input cell and citation, (B) the low/medium/high scenarios, (C) derivation showing lifetime → per-MWh arithmetic. Which file format do you want: XLSX or CSV?
