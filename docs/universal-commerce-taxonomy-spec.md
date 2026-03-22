# Universal Commerce Taxonomy Specification

**Version**: 0.1-draft
**Date**: March 2026
**Status**: Working document — foundational axioms for the Semantic Commerce Operating System
**Companion**: plexus-unified-spec.md, SOSP-PROTOCOL-SPECIFICATION.md

---

## 1. Thesis

Every commercial interaction decomposes into three orthogonal dimensions:

1. **WHAT** — the thing being transacted (a good, service, resource, right, or capital instrument)
2. **HOW** — the transaction shape (sale, rental, hire, licence, metered flow, exchange, grant, bond)
3. **INSTRUMENT** — the commercial document produced (contract, quote, invoice, receipt, order, certificate, channel, escrow, claim)

These dimensions are independent. A guitar can be sold, rented, or traded. A plumbing service can be hired on fixed price or metered hourly. A real estate property can be sold, rented, or licensed for short-stay. The WHAT doesn't determine the HOW. The combination of WHAT + HOW determines the INSTRUMENT.

The taxonomy uses LTREE-compatible dotted paths. Each node carries typed attributes, governance weights, and embedding vectors for semantic classification. The WHAT tree self-grows as users list new things. The HOW and INSTRUMENT trees are axiomatic — they represent the finite grammar of commerce and do not grow.

---

## 2. Design Principles

**Axioms don't grow.** The trunk (L0 and L1) of each dimension is fixed. These are the universal primitives of commerce. Adding a new L0 root requires a SOSP governance proposal with 67% consensus.

**Leaves self-patch.** When a user attempts to list something that doesn't match an existing leaf, the system proposes a new node. Community or governance approves. The tree grows from the edges, not the trunk.

**Paths are canonical.** Each node has exactly one LTREE path. Multiple SNS routes can resolve to the same canonical path (e.g., `sports.water.surfing` and `recreation.surfing` can both resolve to the canonical `goods.sporting.water-sports.surfboards` for a surfboard listing). The canonical path determines typed attributes, governance weights, and contract templates. SNS aliases determine discoverability.

**Dimensions compose, don't nest.** A listing is typed by `(WHAT, HOW, INSTRUMENT)`, not by a single deep path that conflates all three. This prevents the combinatorial explosion of having `services.trades.plumbing.rental` alongside `services.trades.plumbing.hire` — the WHAT is `services.trades.plumbing`, the HOW is `tx.hire` or `tx.rental`, and they compose independently.

**Category determines UI.** The WHAT path selects the modal template (photo gallery for vehicles, booking calendar for rentals, intake form for services). The HOW type selects the transaction flow (checkout for sale, channel setup for metered). The INSTRUMENT type selects the document template (contract, quote, invoice).

**Embeddings live on the WHAT tree.** The WHAT tree is the only dimension that benefits from vector search (thousands of nodes, free-text classification needed). HOW is 8 values — keyword extraction. INSTRUMENT is derived from WHAT + HOW — lookup, not search.

---

## 3. Dimension 1: WHAT (Domain Taxonomy)

The WHAT tree classifies what is being transacted. Five roots, each representing a fundamentally different kind of economic object.

### 3.1 L0 Roots

| Root | Description | Ownership Model |
|------|-------------|-----------------|
| `goods` | Physical or digital objects that transfer ownership | Object changes hands |
| `services` | Labour, expertise, creative output, professional work | Time/skill is exchanged |
| `resources` | Space, time, energy, compute, bandwidth, capacity | Access is metered or bounded |
| `rights` | Licences, access, permissions, memberships, IP | Entitlement is granted |
| `capital` | Money, equity, debt, tokens, financial instruments | Value is transferred or committed |

### 3.2 L1 Branches (Universal — do not self-patch)

#### goods.*

| Path | Description | Examples |
|------|-------------|----------|
| `goods.vehicles` | Motor vehicles, boats, aircraft, trailers | Cars, utes, motorcycles, caravans |
| `goods.electronics` | Computers, phones, audio, components | Laptops, phones, speakers, GPUs |
| `goods.materials` | Raw and processed materials for construction/manufacture | Timber, steel, concrete, copper pipe |
| `goods.furniture` | Home and office furniture, fixtures | Tables, chairs, shelving, beds |
| `goods.clothing` | Apparel, footwear, accessories | Shirts, boots, watches, bags |
| `goods.food` | Produce, prepared food, beverages, ingredients | Fresh produce, meal prep, wine, coffee |
| `goods.sporting` | Sports equipment, outdoor gear, fitness | Surfboards, weights, camping gear |
| `goods.tools` | Hand tools, power tools, workshop equipment | Drills, saws, welders, lathes |
| `goods.instruments` | Musical instruments, audio equipment | Guitars, drums, microphones, amps |
| `goods.art` | Original artworks, prints, sculptures, collectibles | Paintings, photography, ceramics |
| `goods.books` | Physical and digital books, media | Textbooks, novels, vinyl, games |
| `goods.parts` | Replacement parts, components, accessories | Auto parts, plumbing fittings, PCBs |
| `goods.pets` | Animals, pet supplies, livestock | Dogs, aquariums, feed, veterinary |
| `goods.digital` | Software, datasets, digital media, NFTs | Apps, templates, stock photos, 3D models |

#### services.*

| Path | Description | Examples |
|------|-------------|----------|
| `services.trades` | Licensed and unlicensed trade work | Plumbing, electrical, carpentry, fencing |
| `services.professional` | White-collar professional services | Legal, accounting, consulting, architecture |
| `services.creative` | Design, media, content, artistic services | Graphic design, video production, copywriting |
| `services.tech` | Software, IT, data, engineering services | Web dev, DevOps, data science, security |
| `services.education` | Teaching, tutoring, training, coaching | Music lessons, test prep, corporate training |
| `services.health` | Health, wellness, fitness, therapy | Physio, personal training, counselling |
| `services.care` | Childcare, aged care, pet care, disability support | Babysitting, home care, dog walking |
| `services.transport` | Moving, delivery, courier, logistics | Removalists, freight, food delivery |
| `services.cleaning` | Residential, commercial, specialized cleaning | House cleaning, carpet, pressure washing |
| `services.events` | Event planning, catering, entertainment | Wedding planning, DJ, photography |
| `services.beauty` | Hair, beauty, grooming, cosmetic services | Hairdresser, nails, barbershop |
| `services.automotive` | Vehicle repair, detailing, mechanical | Mechanic, panel beater, tyre fitting |

#### resources.*

| Path | Description | Examples |
|------|-------------|----------|
| `resources.space` | Physical spaces for use or storage | Warehouses, offices, parking, co-working |
| `resources.energy` | Electricity, gas, solar, battery, grid access | Solar feed-in, EV charging, generator hire |
| `resources.compute` | Cloud, GPU, AI inference, hosting | AWS instances, GPU clusters, API endpoints |
| `resources.bandwidth` | Network capacity, data transfer | CDN, VPN, dedicated lines |
| `resources.storage` | Digital storage, physical storage, archival | S3 buckets, self-storage units, cold storage |
| `resources.time` | Bookable time slots, appointments, availability | Consultation slots, studio time, court bookings |
| `resources.equipment` | Machinery, vehicles, tools for temporary use | Excavators, concrete mixers, scaffolding |
| `resources.venues` | Event spaces, function rooms, stadiums | Conference rooms, halls, outdoor spaces |

#### rights.*

| Path | Description | Examples |
|------|-------------|----------|
| `rights.licences` | Software licences, usage rights, IP licences | SaaS subscriptions, patent licences, music sync |
| `rights.access` | Memberships, passes, gated content | Gym memberships, course access, VIP passes |
| `rights.permissions` | Capability grants, role assignments, delegations | API keys, admin access, proxy authority |
| `rights.certifications` | Professional certifications, accreditations | Trade licences, ISO certs, course completions |
| `rights.franchises` | Franchise rights, territorial licences | Business franchises, distribution rights |
| `rights.domains` | Domain names, namespaces, identifiers | Web domains, SNS namespaces, handles |

#### capital.*

| Path | Description | Examples |
|------|-------------|----------|
| `capital.currency` | Fiat and cryptocurrency payments | AUD, USD, BSV, stablecoins |
| `capital.equity` | Ownership stakes, shares, tokens | Company shares, DAO tokens, revenue share |
| `capital.debt` | Loans, bonds, credit, IOUs | Personal loans, invoice factoring, bonds |
| `capital.receivables` | Outstanding invoices, accounts receivable | Unpaid invoices, payment plans, installments |
| `capital.insurance` | Coverage, policies, risk instruments | Public liability, trade warranty, equipment cover |
| `capital.deposits` | Held funds, security deposits, retainers | Bond, booking deposit, project retainer |
| `capital.grants` | Non-repayable funding, subsidies, prizes | Government grants, competition prizes, donations |

### 3.3 L2+ (Self-Growing)

Below L1, the tree self-patches. Examples of L2 nodes under `services.trades`:

```
services.trades.plumbing
services.trades.plumbing.emergency
services.trades.plumbing.renovation
services.trades.plumbing.gas-fitting
services.trades.electrical
services.trades.electrical.domestic
services.trades.electrical.commercial
services.trades.electrical.solar
services.trades.carpentry
services.trades.carpentry.structural
services.trades.carpentry.cabinetry
services.trades.carpentry.decking
services.trades.fencing
services.trades.fencing.colorbond
services.trades.fencing.timber
services.trades.fencing.pool
...
```

Each L2+ node inherits its parent's attributes and can add category-specific ones. `services.trades.plumbing` adds `fixture_type`, `pipe_material`, `water_shutoff_known`. `services.trades.plumbing.gas-fitting` inherits those and adds `gas_licence_required: true`.

### 3.4 Self-Patch Protocol

1. User attempts to list into a category path that doesn't exist
2. System identifies the deepest matching ancestor
3. System proposes a new leaf node with:
   - Suggested slug (from NLP extraction)
   - Inherited attributes from parent
   - Suggested additional attributes (from LLM analysis of the listing content)
   - Suggested embedding (from the listing text)
4. Proposal enters review queue (governance-weighted)
5. On approval: node is created, embedding is indexed, SNS routes are registered
6. On rejection: listing is assigned to the nearest existing node

For L2 patches (common, low-risk): auto-approve after N similar listings cluster near the same embedding region. For L1 patches (rare, structural): require explicit governance approval.

---

## 4. Dimension 2: HOW (Transaction Types)

The HOW dimension classifies the transaction shape. Eight primitives. These are axiomatic — they do not self-grow.

### 4.1 Transaction Primitives

| Type | Path | Description | Settlement Pattern |
|------|------|-------------|-------------------|
| Sale | `tx.sale` | Ownership transfers permanently | One-time payment (immediate, escrow, or installment) |
| Rental | `tx.rental` | Temporary possession with return obligation | Periodic payment (daily, weekly, monthly) |
| Hire | `tx.hire` | Service engagement — labour/expertise exchanged | Fixed price, hourly, milestone, or completion |
| Licence | `tx.licence` | Rights granted for bounded use | Subscription, per-seat, per-use, or perpetual |
| Meter | `tx.meter` | Continuous flow — pay per unit consumed | MFP payment channel with per-tick settlement |
| Exchange | `tx.exchange` | Mutual transfer — both parties give and receive | Atomic swap or escrow-mediated trade |
| Grant | `tx.grant` | Unilateral transfer — no reciprocation expected | No settlement (donation, gift, freebie) |
| Bond | `tx.bond` | Commitment without immediate transfer | Held funds (escrow, deposit, guarantee, retainer) |

### 4.2 Composability Rules

Most WHAT categories support multiple HOW types:

| WHAT | Valid HOW types |
|------|----------------|
| `goods.*` | sale, rental, exchange, grant |
| `services.*` | hire, meter, exchange, grant |
| `resources.*` | rental, licence, meter |
| `rights.*` | licence, sale, grant |
| `capital.*` | sale, exchange, grant, bond |

The category node metadata includes a `validTransactionTypes` array that constrains which HOW types are valid for that WHAT path. `services.trades.plumbing` supports `[hire, meter]`. `goods.vehicles.cars` supports `[sale, rental, exchange, grant]`. This prevents invalid combinations at the schema level.

### 4.3 HOW Determines Settlement

The HOW type directly maps to a CashLanes settlement pattern:

| HOW | CashLanes Pattern |
|-----|-------------------|
| `tx.sale` | Single UTXO transfer or escrow-release |
| `tx.rental` | Periodic payment channel, nSequence increments on each period |
| `tx.hire` | Milestone-gated escrow or completion-triggered release |
| `tx.licence` | Recurring payment channel with auto-renewal |
| `tx.meter` | MFP channel — per-unit ticks, nSequence settlement |
| `tx.exchange` | Atomic swap or dual-escrow release |
| `tx.grant` | No settlement UTXO — attestation-only |
| `tx.bond` | Time-locked escrow with conditional release |

---

## 5. Dimension 3: INSTRUMENT (Document Types)

The INSTRUMENT dimension classifies the commercial document that the compiler outputs. These are the typed predicates that get compiled down through LISP → Forth → Script.

### 5.1 Instrument Types

| Type | Path | Description | Compiler Output |
|------|------|-------------|-----------------|
| Contract | `inst.contract` | Binding agreement between parties | Signed predicates, UTXO-locked obligations |
| Quote | `inst.quote` | Non-binding offer with terms and pricing | Unsigned predicates, time-bounded validity |
| Invoice | `inst.invoice` | Payment request from provider to customer | Payment UTXO with amount and conditions |
| Receipt | `inst.receipt` | Confirmation of payment or delivery | SPV proof + attestation |
| Order | `inst.order` | Purchase order or work order | Commitment predicate, pending fulfilment |
| Certificate | `inst.certificate` | Attestation, credential, K-Asset | BRC-52 cert with ATTESTATION domain key |
| Channel | `inst.channel` | Payment channel (MFP) | 2-of-2 multisig funding TX |
| Escrow | `inst.escrow` | Held funds with conditional release | Time-locked or multi-party release script |
| Claim | `inst.claim` | Dispute, insurance claim, warranty claim | Dispute predicate referencing original contract |

### 5.2 Instrument Derivation

The instrument type is derived from the combination of WHAT + HOW + conversation state:

```
WHAT: services.trades.plumbing
HOW:  tx.hire
STATE: scope_defined, estimate_presented, estimate_accepted
→ INSTRUMENT: inst.contract (service agreement)

WHAT: services.trades.plumbing
HOW:  tx.hire
STATE: scope_defined, estimate_not_yet_presented
→ INSTRUMENT: inst.quote (rough-order-of-magnitude)

WHAT: goods.vehicles.ute
HOW:  tx.sale
STATE: listing_created, buyer_interested
→ INSTRUMENT: inst.contract (purchase agreement with escrow)

WHAT: resources.energy.solar
HOW:  tx.meter
STATE: channel_funded
→ INSTRUMENT: inst.channel (MFP metered flow)
```

### 5.3 Instrument Subtypes

Each instrument type has subtypes at L1:

```
inst.contract.service-agreement
inst.contract.purchase-agreement
inst.contract.rental-agreement
inst.contract.nda
inst.contract.partnership
inst.contract.employment
inst.contract.independent-contractor

inst.quote.rough-order-of-magnitude
inst.quote.fixed-price
inst.quote.itemised
inst.quote.time-and-materials

inst.invoice.standard
inst.invoice.progress
inst.invoice.recurring
inst.invoice.final

inst.order.purchase-order
inst.order.work-order
inst.order.change-order

inst.channel.prepaid
inst.channel.postpaid
inst.channel.bidirectional

inst.escrow.time-locked
inst.escrow.milestone-gated
inst.escrow.dual-party-release
inst.escrow.arbitrated
```

---

## 6. Composition Model

A complete commercial interaction is typed by the triple `(WHAT, HOW, INSTRUMENT)`:

### 6.1 Examples

| Scenario | WHAT | HOW | INSTRUMENT |
|----------|------|-----|------------|
| Hire a plumber | `services.trades.plumbing` | `tx.hire` | `inst.contract.service-agreement` |
| Sell a car | `goods.vehicles.cars` | `tx.sale` | `inst.contract.purchase-agreement` |
| Rent a concrete mixer | `resources.equipment.construction` | `tx.rental` | `inst.contract.rental-agreement` |
| Solar feed-in metering | `resources.energy.solar` | `tx.meter` | `inst.channel.bidirectional` |
| Software subscription | `rights.licences.software` | `tx.licence` | `inst.contract.service-agreement` |
| Trade guitar for amp | `goods.instruments.guitars` | `tx.exchange` | `inst.escrow.dual-party-release` |
| Donate furniture | `goods.furniture.home` | `tx.grant` | `inst.receipt` |
| Festival ticket | `resources.venues.outdoor` | `tx.licence` | `inst.certificate` |
| Project retainer | `capital.deposits` | `tx.bond` | `inst.escrow.time-locked` |
| Electrician K-Asset | `rights.certifications.trades` | — | `inst.certificate` |

### 6.2 Modal Template Selection

The WHAT path determines the primary modal template:

| WHAT L0 | Modal Components |
|---------|-----------------|
| `goods.*` | Photo gallery, condition selector, shipping/pickup, specs grid |
| `services.*` | Intake form, scope fields, site-visit flag, licence check, calendar |
| `resources.*` | Availability calendar, capacity meter, booking widget, usage dashboard |
| `rights.*` | Terms viewer, access scope, duration selector, renewal options |
| `capital.*` | Amount input, term selector, interest/fee calculator, schedule viewer |

The HOW type adds transaction-specific UI:

| HOW | Additional UI |
|-----|---------------|
| `tx.sale` | Buy/checkout button, payment method, escrow option |
| `tx.rental` | Date range picker, deposit calculator, return conditions |
| `tx.hire` | Brief/scope editor, milestone definer, hourly rate or fixed toggle |
| `tx.licence` | Seat count, billing period, usage limits |
| `tx.meter` | Flow rate display, running total, channel balance |
| `tx.exchange` | Split view (yours/theirs), fairness indicator |
| `tx.grant` | Claim button, availability counter |
| `tx.bond` | Lock amount, conditions editor, release trigger |

---

## 7. Embedding Strategy

### 7.1 WHAT Tree Embeddings

Every node in the WHAT tree gets a 384-dimensional embedding vector stored in Qdrant.

**Embedding source**: Concatenation of node name + description + all ancestor names + classification keywords. Example for `services.trades.plumbing`:

```
"services trades plumbing — licensed trade work involving water supply,
drainage, gas fitting, pipe repair, fixture installation. Includes
emergency plumbing, renovation plumbing, hot water systems, blocked drains,
leak detection, tap repair, toilet repair, pipe relining."
```

**Classification flow**:
1. User inputs free text: "my kitchen tap is dripping"
2. Text is embedded (same 384-dim model)
3. Nearest-neighbor search in Qdrant against WHAT tree nodes
4. Top result: `services.trades.plumbing` (cosine 0.94)
5. Result carries metadata: canonical path, typed attributes, valid HOW types, modal template

### 7.2 HOW Classification

HOW type is extracted via keyword/intent analysis, not vector search. The HOW dimension is only 8 values — keyword matching is sufficient and more reliable than vector similarity.

Intent signals:

| Signal | HOW |
|--------|-----|
| "buy", "purchase", "how much", "for sale" | `tx.sale` |
| "rent", "hire out", "borrow", "lease" | `tx.rental` |
| "need a", "looking for someone to", "get a quote" | `tx.hire` |
| "subscribe", "access", "licence", "membership" | `tx.licence` |
| "per kWh", "per MB", "per hour", "metered" | `tx.meter` |
| "trade", "swap", "exchange" | `tx.exchange` |
| "free", "giving away", "donate" | `tx.grant` |
| "deposit", "hold", "escrow", "retainer" | `tx.bond` |

### 7.3 Embedding Overlay for Multi-Path Resolution

Multiple SNS routes can resolve to the same canonical WHAT node. The overlay stores alias embeddings — alternative phrasings that map to existing nodes:

```
Canonical: services.trades.plumbing
Alias embeddings:
  - "water pipe repair" → services.trades.plumbing
  - "blocked drain" → services.trades.plumbing
  - "hot water system" → services.trades.plumbing
  - "gasfitter" → services.trades.plumbing.gas-fitting
```

When a new listing's embedding doesn't match any canonical node above a threshold (e.g., cosine < 0.80), this triggers the self-patch protocol (section 3.4). When it matches an alias but not the canonical embedding, the alias route is reinforced.

---

## 8. Database Schema (Drizzle/Postgres)

### 8.1 Categories Table

```sql
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(100) NOT NULL,
    name            VARCHAR(256) NOT NULL,
    path            VARCHAR(500) NOT NULL UNIQUE,    -- LTREE-compatible dotted path
    dimension       VARCHAR(20) NOT NULL,            -- 'what', 'how', 'instrument'
    level           SMALLINT NOT NULL,               -- 0=root, 1=branch, 2+=leaf
    parent_path     VARCHAR(500),                    -- parent's dotted path (null for roots)

    -- Attributes
    description     TEXT,
    attributes      JSONB DEFAULT '[]',              -- CategoryAttribute[] for extraction hints
    keywords        JSONB DEFAULT '[]',              -- classification keywords

    -- Governance
    value_multiplier    NUMERIC(3,2) DEFAULT 1.00,   -- economic weight
    site_visit_likely   BOOLEAN DEFAULT false,
    licensed_trade      BOOLEAN DEFAULT false,
    valid_tx_types      JSONB DEFAULT '[]',          -- valid HOW types for this WHAT node
    modal_template      VARCHAR(100),                -- UI modal identifier

    -- Embedding
    embedding_text      TEXT,                         -- text used to generate vector
    embedding_version   VARCHAR(20),                  -- model version that generated it

    -- Self-patch metadata
    auto_approved       BOOLEAN DEFAULT false,
    patch_source        VARCHAR(50),                  -- 'seed', 'user_proposal', 'auto_cluster'
    proposal_count      INTEGER DEFAULT 0,            -- listings that proposed this node

    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_path ON categories USING btree (path);
CREATE INDEX idx_categories_parent ON categories (parent_path);
CREATE INDEX idx_categories_dimension ON categories (dimension);
CREATE INDEX idx_categories_level ON categories (dimension, level);
CREATE INDEX idx_categories_slug ON categories (slug);
```

### 8.2 Jobs Table Migration

Replace the `job_category` enum with a path reference:

```sql
-- Add new column
ALTER TABLE jobs ADD COLUMN category_path VARCHAR(500);
ALTER TABLE jobs ADD COLUMN tx_type VARCHAR(20) DEFAULT 'hire';
ALTER TABLE jobs ADD COLUMN instrument_type VARCHAR(100);

-- Migrate existing data
UPDATE jobs SET category_path = 'services.trades.' ||
  CASE job_type
    WHEN 'carpentry' THEN 'carpentry'
    WHEN 'plumbing' THEN 'plumbing'
    WHEN 'electrical' THEN 'electrical'
    WHEN 'painting' THEN 'painting'
    WHEN 'fencing' THEN 'fencing'
    WHEN 'tiling' THEN 'tiling'
    WHEN 'roofing' THEN 'roofing'
    WHEN 'doors_windows' THEN 'doors-windows'
    WHEN 'gardening' THEN 'gardening'
    WHEN 'cleaning' THEN 'cleaning'
    WHEN 'general' THEN 'general-handyman'
    WHEN 'other' THEN 'general-handyman'
  END;

UPDATE jobs SET tx_type = 'hire';

-- Index
CREATE INDEX idx_jobs_category_path ON jobs (category_path);
```

---

## 9. OJT Mapping

OJT operates entirely within one WHAT subtree and one HOW type:

- **WHAT**: `services.trades.*` (11 categories today, self-grows)
- **HOW**: `tx.hire` (always — OJT is a service hiring platform)
- **INSTRUMENT**: `inst.quote` → `inst.contract.service-agreement` (as conversation progresses)

The category tree built in Sprint 5B (`categoryTree.ts`) maps directly:

| Current OJT slug | Universal path |
|-------------------|----------------|
| plumbing | `services.trades.plumbing` |
| electrical | `services.trades.electrical` |
| carpentry | `services.trades.carpentry` |
| painting | `services.trades.painting` |
| tiling | `services.trades.tiling` |
| fencing | `services.trades.fencing` |
| roofing | `services.trades.roofing` |
| doors-windows | `services.trades.doors-windows` |
| gardening | `services.trades.gardening` |
| cleaning | `services.trades.cleaning` |
| general-handyman | `services.trades.general-handyman` |

All existing OJT functionality (extraction hints, value multipliers, scoring context) remains identical — only the path format changes from `services.home-repair.plumbing` to `services.trades.plumbing`.

---

## 10. Future: Shomee Full Taxonomy

The 47 existing Shomee L0 roots remap into the universal trunk:

| Shomee L0 | Universal Mapping |
|-----------|-------------------|
| marketplace-and-commerce | `goods.*` (split by type) |
| services | `services.*` |
| vehicles | `goods.vehicles.*` |
| real-estate | `resources.space.*` + `goods.property.*` |
| rentals | `resources.*` (with `tx.rental`) |
| events | `resources.venues.*` + `services.events.*` |
| jobs | `services.*` (with `tx.hire`) |
| gigs | `services.*` (with `tx.hire`, short-term) |
| digital-assets | `goods.digital.*` + `rights.licences.*` |
| contracts-and-agreements | `inst.contract.*` (INSTRUMENT dimension) |
| trade | ANY WHAT (with `tx.exchange`) |
| free-stuff | ANY WHAT (with `tx.grant`) |
| wanted | ANY WHAT (demand-side flag, not a category) |
| food-and-drink | `goods.food.*` |
| tools-and-infrastructure | `goods.tools.*` + `resources.compute.*` |
| education | `services.education.*` |
| content-creation | `services.creative.*` |

Content-type roots (essays, discussions, reviews, social-posts, imageboards, newsletters, Q&A, guides) move to a separate **content type** enum on the listing, not the category tree. These describe the expression format, not the commercial type.

---

## 11. Glossary

| Term | Definition |
|------|------------|
| **Canonical path** | The single authoritative LTREE path for a category node |
| **SNS route** | A semantic naming system path that resolves to a canonical node (may be canonical, vanity, or TimeVector) |
| **Self-patch** | The process by which new category nodes are proposed and approved when users list things the tree doesn't yet cover |
| **Dimension** | One of the three orthogonal classification axes (WHAT, HOW, INSTRUMENT) |
| **Trunk** | L0 and L1 of each dimension — axiomatic, does not self-grow |
| **Leaf** | L2+ node — created by self-patch protocol |
| **Value multiplier** | Per-category economic weight used in scoring (e.g., fencing 1.5x, gardening 0.8x) |
| **Modal template** | UI rendering template selected by WHAT path (gallery, calendar, intake form, etc.) |
| **Embedding overlay** | Qdrant collection mapping alternative phrasings (alias embeddings) to canonical nodes |
