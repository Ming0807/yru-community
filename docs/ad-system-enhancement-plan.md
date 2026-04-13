# Ad System Enhancement Plan
## YRU Community - MVP Phase

---

## Executive Summary

ระบบโฆษณาที่ดีต้องมี **3 วงจรหลัก**:
1. **Targeting** - ถึงกลุ่มเป้าหมายที่ถูกต้อง
2. **Delivery** - แสดงผลอย่างมีประสิทธิภาพ
3. **Optimization** - ปรับปรุงจากข้อมูลจริง

---

## Phase 1: Foundation (MVP) ✅ พร้อมเกือบหมด

### 1.1 User Segmentation Engine
```
Rules-based Segmentation (ไม่ต้อง ML)
```

| Segment | Rules | Use Case |
|---------|-------|----------|
| **By Activity** | active users (30/7/1 วัน), dormant, new | Retargeting |
| **By Engagement** | high (>10 posts), medium, low, ghost | Behavioral targeting |
| **By Faculty** | คณะวิทย์, วิศวะ, บริหาร, etc. | Demographic |
| **By Interests** | ตาม categories ที่ follow/interact | Interest-based |
| **By Device** | mobile, desktop, tablet | Creative optimization |
| **By Time Pattern** | morning, afternoon, evening, night | Ad scheduling |
| **By Content Type** | text, image, link, poll | Content preference |

**Implementation:**
- `user_segments` table - pre-computed segments รายวัน/รายชั่วโมง
- Segment membership tracking (history)
- Real-time segment updates via triggers

### 1.2 Ad Performance Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    Campaign Overview                         │
├─────────────────────────────────────────────────────────────┤
│  📊 Reach          📊 Engagement       📊 Conversion        │
│  ├─ Impressions    ├─ Clicks (CTR)     ├─ Actions          │
│  ├─ Unique Reach   ├─ Engagements      ├─ Cost/Action      │
│  ├─ Reach Rate %   ├─ Time on Ad       ├─ ROAS             │
│  ├─ Frequency      └─ Scroll Stop %    └─ Attribution      │
│  └─ Discovery %                                               │
└─────────────────────────────────────────────────────────────┘
```

**Metrics Hierarchy:**
```
Level 1: Awareness (Impressions, Reach, Frequency)
Level 2: Consideration (Clicks, CTR, Engagements)
Level 3: Conversion (Actions, Cost/Action, ROAS)
```

### 1.3 Auto-Targeting System (Rule-Based)

**วิธีทำ:** ไม่ต้อง ML ใช้ Rule Engine

```sql
-- Auto-targeting rules examples
RULE: "High Engagement + Tech Faculty + Active 7 days"
  → Target: แคมเปญ tech products

RULE: "New User (< 7 days) + No Posts"
  → Target: Onboarding ads, low-friction offers

RULE: "High Spender History + Dormant 30 days"
  → Target: Re-engagement campaigns

RULE: "Category:Food + Evening hours + Weekend"
  → Target: Restaurant promos
```

**Components:**
- `targeting_rules` table - rule definitions
- `rule_evaluations` table - evaluation history
- Rule engine API - evaluate user against rules
- A/B testing framework for rules

---

## Phase 2: Analytics Deep Dive 📋 Priority High

### 2.1 Cohort Analysis

```
User Cohort Behavior Over Time:

        Week 1   Week 2   Week 3   Week 4
        ──────   ──────   ──────   ──────
Cohort A (New)   100%     45%      30%      25%
Cohort B (Ret)   100%     80%      65%      55%
Cohort C (High)  100%     95%      90%      88%
```

**Use Cases:**
- ดูว่า user ที่เห็น ad มี behavior เปลี่ยนแปลงไหม
- Compare ad-exposed vs non-exposed cohorts
- Calculate true ad effect on user behavior

### 2.2 Funnel Analysis

```
Ad View → Click → Landing → Action → Conversion
   │        │        │        │         │
 100%     5.2%     3.1%     1.8%      0.9%
          └── CTR ──┘                   │
              └────── Conversion ──────┘

Drop-off points analysis:
- High drop-off: creative issue
- Low CTR: targeting issue
- Low landing → action: landing page issue
```

### 2.3 Attribution Models

```
1. Last Click          : Ad สุดท้ายก่อน action ได้เครดิต
2. First Click         : Ad แรกที่สร้าง awareness ได้เครดิต
3. Linear              : เครดิตแบ่งกันทุก touchpoint
4. Time Decay          : Ad ที่ใกล้ action สุดได้มากสุด
5. Data Driven         : ML-based attribution (future)
```

### 2.4 Predictive Metrics

**Rule-based predictions (no ML):**

| Metric | Calculation | Use |
|--------|-------------|-----|
| Churn Risk | (dormant days × inactivity rate) | Retargeting priority |
| LTV Estimate | avg spend × expected sessions | Budget allocation |
| Propensity Score | engagement rank percentile | Audience scoring |
| Similarity Score | behavior vector distance | Lookalike (future) |

---

## Phase 3: Smart Targeting 📋 Priority Medium

### 3.1 Behavioral Pattern Analysis

**Data Points to Capture:**

```
User Behavior Profile:
├── Content Interactions
│   ├── Categories viewed
│   ├── Time spent per category
│   ├── Scroll depth patterns
│   └── Return visit frequency
├── Purchase Signals (if applicable)
│   ├── Products viewed
│   ├── Add-to-cart events
│   └── Purchase history
├── Engagement Patterns
│   ├── Post types preferred (text/image/video/link)
│   ├── Interaction style (react/comment/share)
│   └── Peak activity hours
└── Contextual Signals
    ├── Location (campus/outside)
    ├── Device switching
    └── Session duration patterns
```

### 3.2 Interest Mapping

```
Interest Taxonomy:
├── Level 1 (Broad)
│   ├── Academic
│   ├── Social
│   ├── Commerce
│   └── Entertainment
├── Level 2 (Medium)
│   │   ├── Academic: ข่าวสอบ, ทุนการศึกษา, กิจกรรม
│   │   ├── Commerce: อาหาร, เสื้อผ้า, gadget
│   │   └── Social: ปาร์ตี้, การเดต, หาเพื่อน
│   └── Level 3 (Specific)
│       └── ร้านข้าวแกงใต้มหาลัย, ทุน กยศ.
```

**Implementation:**
- `user_interests` table - weighted interests
- Interest score decay over time (freshness)
- Cross-category interest discovery
- Competitor interest mapping

### 3.3 Lookalike Audiences (Simple Version)

```
Method: Rule-based similarity

Similar Users = Users who share:
├── Same faculty (weight: 1.0)
├── Same activity level (±20%) (weight: 0.8)
├── Similar interests (>50% overlap) (weight: 1.5)
├── Similar online hours (weight: 0.5)
└── Same device type (weight: 0.3)
```

### 3.4 Dynamic Creative Optimization

```
Based on User Segment:
├── Show different images per faculty
├── Show different headlines per interest
├── Show different CTA per engagement level
├── Show social proof (X people viewed)
└── Show urgency (Y spots left)
```

---

## Phase 4: Advanced Features 📋 Priority Low (Future)

### 4.1 ML-Based Recommendations (Future)

When budget available:
- **Collaborative Filtering**: "Users like you also clicked..."
- **Content-Based Filtering**: "Similar to posts you engaged with..."
- **Predictive Bidding**: Auto-bid based on conversion probability
- **Audience Expansion**: Find similar users automatically

### 4.2 Real-time Bidding (Future)

- Header bidding integration
- Floor price optimization
- Demand partner management

---

## Detailed Implementation Plan

### Database Schema Additions

```sql
-- Phase 1: User Segments
CREATE TABLE user_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  segment_type VARCHAR(50) NOT NULL, -- 'activity', 'engagement', 'faculty', 'interest', 'device', 'time', 'content'
  segment_value JSONB NOT NULL, -- {'level': 'high', 'score': 85, 'confidence': 0.9}
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, segment_type)
);

-- Phase 2: Ad Events (Enhanced)
CREATE TABLE ad_impressions (
  id UUID DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id),
  user_id UUID REFERENCES users(id),
  impression_uuid UUID UNIQUE, -- for deduplication
  segment_snapshot JSONB, -- snapshot of user segments at impression time
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),
  country VARCHAR(50),
  city VARCHAR(100),
  referrer TEXT,
  view_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ad_viewability (
  id UUID DEFAULT gen_random_uuid(),
  impression_id UUID REFERENCES ad_impressions(id),
  viewable BOOLEAN,
  viewability_score DECIMAL(5,2), -- 0-100%
  in_view_duration_ms INTEGER,
  ad_position VARCHAR(20), -- above_fold, below_fold
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 3: User Interests
CREATE TABLE user_interests (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  category_id UUID REFERENCES categories(id),
  interest_score DECIMAL(5,2), -- 0-100
  interaction_count INTEGER,
  last_interaction_at TIMESTAMPTZ,
  decay_factor DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

-- Phase 4: Targeting Rules
CREATE TABLE targeting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL, -- [{field, operator, value, weight}]
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 5: Predictive Scores
CREATE TABLE user_predictive_scores (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  score_type VARCHAR(50) NOT NULL, -- 'churn_risk', 'ltv_estimate', 'propensity', 'similarity'
  score DECIMAL(5,2) NOT NULL,
  factors JSONB, -- breakdown of factors
  model_version VARCHAR(20),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, score_type)
);
```

### API Endpoints

```
GET  /api/admin/analytics/segments
     - List all segment types
     - Get user counts per segment

GET  /api/admin/analytics/cohorts
     - Cohort analysis data
     - Params: date_range, cohort_type

GET  /api/admin/analytics/funnel
     - Funnel visualization
     - Params: campaign_id, date_range

GET  /api/admin/analytics/attribution
     - Attribution modeling
     - Params: model_type, date_range

POST /api/admin/targeting/rules
     - Create targeting rule

GET  /api/ads/target-audience
     - Get estimated audience size for targeting params

POST /api/ads/preview
     - Preview who will see the ad

GET  /api/users/{id}/interests
     - Get user's interest profile

GET  /api/users/{id}/segments
     - Get user's current segments
```

---

## International Standards Compliance

### IAB Standards (OpenRTB, VAST, etc.)
- Ad serving compliant with OpenRTB 2.5
- Viewability measurement per MRC standards
- Brand safety categorization

### Privacy Compliance (PDPA + GDPR-ready)

```
Data Collection:
├── Consent required before tracking
├── First-party data only (no third-party cookies)
├── Data minimization principle
└── Purpose limitation

User Rights:
├── Right to access (export data)
├── Right to deletion (anonymize)
├── Right to object (opt-out)
└── Right to restrict processing

Data Retention:
├── Impressions: 90 days (aggregated: 1 year)
├── Clicks: 90 days (aggregated: 1 year)
├── PII: 30 days then anonymize
└── Analytics: 2 years max

Transparency:
├── Ad disclosures
├── Why user sees this ad
├── Who advertised
└── How targeting works
```

### Ad Quality Standards

```
Brand Safety:
├── Category exclusions
├── Keyword blacklists
├── Placement verification
└── Fraud detection (invalid traffic)

Creative Standards:
├── Minimum quality score
├── Landing page compatibility
├── Load time requirements
└── Mobile-first compliance

Ad Policies:
├── No misleading claims
├── Clear pricing
├── Honest testimonials
└── Proper disclosure
```

---

## Success Metrics Framework

```
Business Metrics:
├── Revenue per campaign
├── Cost per acquisition
├── Return on ad spend (ROAS)
├── Customer lifetime value from ads
└── Ad-induced engagement increase

Performance Metrics:
├── Delivery rate (ads served / ads submitted)
├── Viewability rate (industry target: 70%+)
├── Verification pass rate
└── Fraud rate (< 1%)

User Experience Metrics:
├── Ad recall rate (survey-based)
├── Negative feedback rate
├── Hide ad rate
└── Time to next action after ad

Platform Metrics:
├── Auction fill rate
├── Average CPM
├── Revenue per thousand impressions (RPM)
└── Publisher take rate
```

---

## Recommended Implementation Order

```
Month 1: Foundation
├── Implement user segments (activity, engagement, faculty)
├── Basic analytics dashboard
├── First-party interest tracking
└── Basic rule-based targeting

Month 2: Analytics
├── Cohort analysis
├── Funnel tracking
├── Attribution models
└── Enhanced interest mapping

Month 3: Optimization
├── Auto-targeting rules engine
├── Dynamic creative basics
├── A/B testing framework
└── Predictive scoring (simple)

Month 4+: Scale
├── ML-powered recommendations (if budget)
├── Advanced attribution
├── Real-time bidding
└── Programmatic features
```

---

## Quick Wins (ทำได้เลย)

1. **Add user_interests tracking** - 1-2 วัน
2. **Enhance ad events** with segment_snapshot - 1 วัน
3. **Build cohort analysis API** - 2-3 วัน
4. **Create targeting rules engine** - 3-5 วัน
5. **Add viewability tracking** - 2-3 วัน

---

## Files to Create/Modify

```
New Files:
├── src/types/analytics/segments.ts
├── src/types/analytics/attribution.ts
├── src/types/advertising/interests.ts
├── src/components/admin/analytics/SegmentAnalysis.tsx
├── src/components/admin/analytics/CohortTable.tsx
├── src/components/admin/analytics/FunnelChart.tsx
├── src/app/api/admin/analytics/segments/route.ts
├── src/app/api/admin/analytics/cohorts/route.ts
├── src/app/api/admin/analytics/funnel/route.ts
├── src/app/api/admin/targeting/rules/route.ts
├── src/app/api/users/[id]/interests/route.ts
└── lib/segmentation/rule-engine.ts

SQL Migrations:
├── supabase/phase46_user_segments.sql
├── supabase/phase47_enhanced_ad_events.sql
├── supabase/phase48_user_interests.sql
├── supabase/phase49_targeting_rules.sql
└── supabase/phase50_predictive_scores.sql
```

---

## Summary

ระบบโฆษณาที่ครบถ้วนตามมาตรฐานสากลต้องมี:

| Component | MVP | Full |
|-----------|-----|------|
| Targeting | Rule-based segments | ML-powered |
| Analytics | Basic dashboard | Predictive |
| Attribution | Last/First click | Multi-touch |
| Optimization | A/B testing | Auto-optimize |
| Compliance | PDPA consent | Full privacy |
| Brand Safety | Basic filters | Real-time |

**Key Insight:** เริ่มจาก MVP ที่ทำได้จริงด้วย rule-based แล้วค่อยๆ เพิ่ม ML หลังจากมีข้อมูลเยอะพอ (data-driven approach)

---

## Next Steps

1. **เลือก feature ที่จะทำต่อ** - จากด้านบน
2. **สร้าง SQL migrations** สำหรับ phase ถัดไป
3. **Implement tracking** - events + segments
4. **Build analytics API** ตาม plan
5. **Create dashboard components**

ต้องการให้ผมเริ่มทำ feature ไหนก่อน?