# YRU Community Remediation Plan

วันที่จัดทำ: 2026-05-04

เอกสารนี้สรุปแผนแก้ไขจากการ review ทั้งโปรเจ็ก โดยเรียงลำดับจากความเสี่ยงสูงสุดไปยังการปรับปรุง performance/UX และ quality gates สำหรับทำงานต่อเป็นรอบ ๆ

## Executive Summary

แนวทางที่ดีที่สุดคือแก้ความเสี่ยงฝั่ง database/API ก่อน เพราะเป็นจุดที่กระทบข้อมูลผู้ใช้และต้นทุนระบบโดยตรง จากนั้นค่อยลด client JavaScript และปรับ UX ฝั่งผู้ใช้

ลำดับแนะนำ:

1. ปิดช่องโหว่ P0/P1 ที่ remote database และ API
2. ดึง schema จริงมาเทียบ migration แล้วแก้ schema drift
3. Harden upload, ads tracking, admin APIs, RPC grants และ RLS
4. ทำ performance/UX pass ฝั่งผู้ใช้
5. ตั้ง lint/test/security/performance gates ใน CI

## Current Evidence

ข้อมูลที่ใช้วิเคราะห์:

| Source | Result |
| --- | --- |
| Supabase CLI | local CLI ใช้งานได้ `supabase@2.98.0` |
| Remote project | `kmgnoyovlyohlpxiudlu`, project `yru_community` |
| Remote schema dump | ได้ไฟล์ `data_dump/remote_schema.sql` จาก `pg_dump` ผ่าน pooler port `6543` |
| Remote advisors | พบ 402 findings: 9 error, 393 warn |
| Frontend bundle | home route ประมาณ 544 KB JS, post detail ประมาณ 613 KB JS, create/edit post มากกว่า 1.1 MB JS |
| Client components | พบ `use client` จำนวนมาก ทำให้ baseline JS สูงในหลาย route |
| Lint | `npm run lint` เคยพบ error/warning จำนวนมาก ต้องจัดเป็น technical debt track |
| Audit | `npm audit --omit=dev` เคยพบ vulnerabilities ใน dependency บางตัว |

หมายเหตุ: `data_dump/` ถูก ignore ใน git แล้ว เพราะเป็น schema snapshot สำหรับวิเคราะห์ ไม่ควร commit ขึ้น repo

## Priority Matrix

| Priority | Area | Impact | Recommended action |
| --- | --- | --- | --- |
| P0 | Account deletion RPC | ผู้ใช้สามารถลบ/anonymize บัญชีคนอื่นได้ถ้า RPC เปิดอยู่ | เพิ่ม owner/admin check และ revoke public execute |
| P0 | Upload API | public endpoint ใช้ Cloudinary credentials ฝั่ง server ถูก abuse storage/bandwidth ได้ | บังคับ auth, rate limit, size/type quota |
| P0 | Admin APIs | บาง endpoint ใช้ข้อมูล admin โดยไม่มี auth guard ชัดเจน | เพิ่ม shared `requireAdmin()` guard |
| P1 | Ad tracking RPC/API | inflate clicks/impressions ได้จาก client payload | ย้าย tracking ผ่าน server-validated event/RPC และ revoke grants |
| P1 | Schema drift | segment functions ยังอ้าง `users`, `posts.user_id`, `comments.user_id`, `reactions` | แก้เป็น `profiles`, `author_id`, `post_reactions` |
| P1 | Security definer grants | advisors พบ security definer functions ที่ anon/authenticated เรียกได้จำนวนมาก | revoke ตาม allowlist และใส่ `search_path` |
| P1 | RLS gaps | advisors พบ table public ที่ยังไม่ enable RLS | enable RLS และ policy ที่จำเป็น |
| P2 | Frontend JS size | route ทั่วไปโหลด JS สูง ทำให้ mobile UX ช้า | split client islands และ lazy load heavy features |
| P2 | Search UX | search ยิง query client-side ทุก debounce และใช้ `ilike` | ทำ search API พร้อม rate limit/index |
| P2 | Feed consistency | load more/realtime ไม่ consistent กับ soft delete/join data | รวม query path และ normalize realtime insert |
| P3 | Quality gates | lint/type/audit ยังไม่เป็น gate ที่บังคับ | ค่อย ๆ ลด lint debt และเพิ่ม CI checks |

## Phase 0: Secret And Baseline Hygiene

Objective: ทำให้เรามีฐานข้อมูลอ้างอิงและลดโอกาส secrets/schema หลุด

Tasks:

- Rotate Supabase access token ที่เคยแชร์ในแชตแล้วสร้าง token ใหม่สำหรับใช้งานจริง
- เก็บ DB password ใน password manager หรือ environment เฉพาะ session เท่านั้น
- ยืนยันว่า `data_dump/` อยู่ใน `.gitignore`
- เก็บ `remote_schema.sql` เป็น local reference เท่านั้น
- สร้าง branch สำหรับงาน hardening เช่น `codex/security-hardening-phase-1`

Acceptance criteria:

- ไม่มี secret ถูกเขียนลง repo
- `git status --short` ไม่แสดงไฟล์ใน `data_dump/`
- มี schema dump ล่าสุดสำหรับเทียบ migration

## Phase 1: Critical Security Hardening

Objective: ปิดช่องโหว่ที่กระทบข้อมูลผู้ใช้และสิทธิ์ admin โดยเร็วที่สุด

### 1.1 Fix Account Deletion RPC

Files:

| File | Action |
| --- | --- |
| `supabase/phase30_account_deletion.sql` | เพิ่ม auth guard |
| new migration | revoke grants และ redefine function |
| `src/app/api/pdpa/delete-user-data/route.ts` | ให้เรียก RPC แบบปลอดภัยหรือใช้ server admin เฉพาะ user/admin |

Implementation:

- `delete_user_account(p_user_id uuid)` ต้องตรวจ `auth.uid() = p_user_id` หรือ `public.is_admin()`
- เพิ่ม `SET search_path = public, auth`
- `REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC, anon, authenticated`
- `GRANT EXECUTE` เฉพาะ role ที่ตั้งใจ เช่น `authenticated` หลัง function มี guard แล้ว หรือไม่ grant ถ้าเรียกผ่าน server-only API
- ตรวจให้ comments/posts ใช้ `author_id` ไม่ใช่ `user_id`

Acceptance criteria:

- user A เรียกลบบัญชี user B ไม่ได้
- user ลบบัญชีตัวเองได้ผ่าน flow ที่ตั้งใจ
- admin ลบบัญชีผู้ใช้ได้ถ้าฟีเจอร์นี้จำเป็น

### 1.2 Lock Down Public Upload

Files:

| File | Action |
| --- | --- |
| `src/app/api/upload/route.ts` | เพิ่ม auth, quota, validation |
| middleware/helper ใหม่ | shared rate limit |

Implementation:

- require authenticated user
- ตรวจ MIME type และ extension allowlist
- จำกัดขนาดไฟล์ เช่น avatar 2 MB, post attachment 10 MB
- จำกัดจำนวน upload ต่อ user ต่อช่วงเวลา
- optional: แยก upload preset/folder ตาม use case
- log abuse attempts แบบไม่เก็บข้อมูลส่วนตัวเกินจำเป็น

Acceptance criteria:

- anonymous upload ได้ `401`
- file type ไม่อนุญาตได้ `415` หรือ `400`
- file ใหญ่เกินได้ `413`
- upload ต่อเนื่องเกิน quota ได้ `429`

### 1.3 Protect Admin APIs

Files:

| File | Action |
| --- | --- |
| `src/app/api/admin/**/route.ts` | ใช้ shared admin guard |
| `src/lib/admin-auth.ts` | สร้าง helper `requireAdmin()` |
| `src/lib/admin-audit.ts` | ใช้ server Supabase/admin client ให้ถูก context |

Implementation:

- เพิ่ม helper ที่ดึง user จาก server client แล้วเช็ก role จาก profiles หรือ claim ที่เชื่อถือได้
- ห้าม endpoint admin ใช้ browser client
- ทุก admin endpoint ต้องตอบ `401` ถ้าไม่ login และ `403` ถ้าไม่ใช่ admin

Acceptance criteria:

- unauthenticated เข้า admin API ไม่ได้
- authenticated non-admin เข้าไม่ได้
- admin เข้าได้และมี audit log

## Phase 2: Remote Database Hardening

Objective: ลด RPC/RLS exposure และแก้ schema drift ที่ยืนยันจาก remote dump

### 2.1 Revoke Risky SECURITY DEFINER Functions

Evidence:

- Advisors พบ `anon_security_definer_function_executable` 38 รายการ
- Advisors พบ `authenticated_security_definer_function_executable` 38 รายการ
- Remote dump ยืนยันว่า functions หลายตัวถูก grant ให้ `anon`, `authenticated`, หรือ implicit public behavior

Actions:

- สร้าง allowlist ของ RPC ที่ client ต้องเรียกจริง
- `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon, authenticated` สำหรับ function ที่เป็น trigger/internal/admin-only
- ใส่ `SET search_path = public, auth` ให้ security definer functions
- เปลี่ยน function ที่ไม่ต้อง elevate privilege เป็น `SECURITY INVOKER`

High-risk function groups:

| Function group | Risk | Direction |
| --- | --- | --- |
| `delete_user_account` | ลบบัญชีคนอื่น | guard + restricted execute |
| `increment_ad_clicks`, `increment_ad_impressions` | inflate ads metrics | revoke public execute |
| `invalidate_cache*`, `warmup_common_caches`, `clean_expired_cache` | cache abuse/DoS | service/admin only |
| `calculate_*_attribution`, `build_attribution_sequences` | expensive analytics compute | admin/service only |
| `log_admin_action` | audit pollution | service/admin only |
| trigger functions | should not be RPC | revoke from public roles |

Acceptance criteria:

- Supabase advisors ลด finding security definer executable ลงอย่างมีนัยสำคัญ
- RPC ที่ client ใช้จริงยังทำงานได้
- trigger functions ไม่ถูกเรียกผ่าน REST RPC ได้

### 2.2 Fix Ad Tracking

Files:

| File | Action |
| --- | --- |
| `src/app/api/ads/track/route.ts` | validate event, rate limit, server-side rules |
| `supabase/phase27_ad_tracking_rpc.sql` | revoke public increments |
| new migration | define safe tracking function if needed |

Implementation:

- client ส่ง event ไป API เท่านั้น ไม่เรียก increment RPC โดยตรง
- API validate `ad_id`, event type, campaign status, active window
- ใช้ idempotency/session window ลด duplicate impression/click
- increment counters ด้วย server service role หรือ RPC ที่ grant เฉพาะ service role
- เก็บ raw event แยกจาก counter เพื่อ audit ได้

Acceptance criteria:

- anon/authenticated เรียก `increment_ad_*` ผ่าน RPC ไม่ได้
- API reject invalid ad/campaign
- repeated events ถูก throttle/deduplicate

### 2.3 Fix Segment Schema Drift

Evidence from remote dump:

- `compute_user_activity_segment` ใช้ `posts.user_id`
- `compute_user_engagement_segment` ใช้ `users`, `posts.user_id`, `comments.user_id`, `reactions`
- `compute_user_interests` ใช้ `reactions`
- `trigger_update_user_segments` ใช้ `NEW.user_id` และ table name `reactions`
- ตารางจริงคือ `profiles`, `posts.author_id`, `comments.author_id`, `post_reactions`

Files:

| File | Action |
| --- | --- |
| `supabase/phase51_user_segments.sql` | แก้ function ให้ตรง schema |
| new migration | replace remote functions |
| related API routes | ตรวจว่ายังเรียก function เดิมถูกต้อง |

Acceptance criteria:

- `select public.update_user_segments('<user_id>')` ไม่ error
- batch compute ไม่อ้าง table/column ที่ไม่มี
- trigger segment update ทำงานกับ `posts`, `comments`, `post_reactions`

### 2.4 Fix RLS And Security Definer Views

Evidence:

- Advisors error: security definer views 7 รายการ
- Advisors error: RLS disabled in public for `ad_frequency_cache`, `ad_viewability_settings`

Actions:

- Enable RLS บน public tables ที่ยังปิดอยู่
- ตรวจ view ที่เป็น security definer แล้วเปลี่ยนเป็น security invoker ถ้าเหมาะสม
- สำหรับ analytics views ที่ควร admin-only ให้ควบคุมผ่าน API/admin client แทน public view
- ลด multiple permissive policies ซ้ำซ้อนใน tables ที่มีหลาย policy เปิดกว้าง

Acceptance criteria:

- Advisors error ลดเป็น 0 หรือเหลือเฉพาะ Supabase-managed exception ที่ documented
- ไม่มี public table ที่ไม่ตั้งใจเปิด RLS

## Phase 3: API And Data Correctness

Objective: ทำให้ server routes เชื่อถือได้ ป้องกัน abuse และแก้ PDPA/data issues

Tasks:

- แก้ PDPA export/delete ให้ใช้ `author_id` สำหรับ posts/comments
- ตรวจทุก route ที่ใช้ service role ว่ามี auth/admin guard ก่อน
- เพิ่ม rate limit ให้ public APIs เช่น upload, ads track, analytics track, report
- ทำ shared error response ไม่ส่งรายละเอียด DB ให้ user
- เพิ่ม structured logging เฉพาะข้อมูลจำเป็น

Acceptance criteria:

- public API ไม่มี route ที่ใช้ service role แบบไม่ guard
- endpoint ที่รับ payload จาก client validate ด้วย schema ชัดเจน
- error response ไม่ leak SQL/Supabase details

## Phase 4: User-Facing Performance And UX

Objective: ลด JS ที่ผู้ใช้ต้องโหลด ลด query ที่ยิงจาก client และทำ interaction ให้เนียนขึ้น

### 4.1 Split Header Into Server + Client Islands

Files:

| File | Action |
| --- | --- |
| `src/components/layout/Header.tsx` | แยก static header ออกจาก interactive menu |
| `src/components/search/SearchBar.tsx` | lazy load หรือ route-specific |
| `src/components/layout/NotificationDropdown.tsx` | load เฉพาะ user login |

Implementation:

- Header shell เป็น server component
- User menu, notification, search เป็น client islands
- Mobile sheet โหลดเมื่อเปิดหรือแยก client component
- ลด `isMounted` pattern ที่ใช้เพื่อเลี่ยง hydration mismatch

Acceptance criteria:

- JS route baseline ลดลงจากประมาณ 500 KB
- UI ไม่ flash login/profile ระหว่างโหลด
- header responsive เหมือนเดิม

### 4.2 Rework Search

Files:

| File | Action |
| --- | --- |
| `src/components/search/SearchBar.tsx` | ลด direct Supabase query |
| `src/app/api/search/route.ts` | เพิ่ม API search |
| Supabase migration | เพิ่ม full-text/trigram index |

Implementation:

- ทำ `/api/search?q=...` พร้อม debounce และ rate limit
- ใช้ `search_vector` หรือ `pg_trgm` แทน `ilike` เต็ม `content_text`
- เพิ่ม cancellation/race handling
- cache suggestion สั้น ๆ

Acceptance criteria:

- search suggestion ไม่แสดงผลเก่าทับผลใหม่
- query เร็วขึ้นบนข้อมูลขนาดใหญ่
- rate limit ป้องกันพิมพ์ถี่จนโหลด DB

### 4.3 Fix Feed Consistency

Files:

| File | Action |
| --- | --- |
| `src/components/post/Feed.tsx` | query path ให้ consistent |
| `src/components/post/InfiniteFeed.tsx` | remove debug alert, filter deleted, hydrate realtime data |
| `src/components/post/PostCard.tsx` | image optimization |

Implementation:

- load more ต้อง filter `deleted_at is null`
- realtime insert ต้อง fetch joined author/category หรือ invalidate/refetch
- เปลี่ยน debug `alert()` เป็น toast friendly message
- แก้ `hasMore` ให้ไม่เพี้ยนจาก realtime insert
- ใช้ `next/image` สำหรับ avatar/thumbnail ที่เป็น user-facing

Acceptance criteria:

- soft-deleted posts ไม่กลับมาใน load more
- post ใหม่ใน realtime แสดง author/category ถูก
- ไม่มี DB error alert ให้ผู้ใช้เห็น

### 4.4 Improve Post Detail Tracking

Files:

| File | Action |
| --- | --- |
| `src/app/(frontend)/post/[id]/page.tsx` | ย้าย view increment ออกจาก render path |
| Supabase migration | เพิ่ม atomic RPC หรือ event table |

Implementation:

- เปลี่ยน read-modify-write `view_count = post.view_count + 1` เป็น atomic increment
- หรือส่ง beacon/event หลัง page load
- deduplicate view ต่อ session/window

Acceptance criteria:

- concurrent views ไม่ทำ count หาย
- page render ไม่ถูก block ด้วย write side effect

### 4.5 Reduce Heavy Route Bundles

Targets:

| Route | Current concern | Action |
| --- | --- | --- |
| `/post/create` | TipTap/editor JS มากกว่า 1.1 MB | lazy load editor and lowlight/code extensions |
| `/post/[id]/edit` | same as create | same |
| `/login` | framer-motion route about 653 KB | reduce motion or lazy motion |
| general routes | shared header/client providers | split islands |
| admin routes | recharts/xlsx | keep admin-only and dynamic import export/chart modules |

Acceptance criteria:

- user-facing normal routes ลด JS baseline อย่างน้อย 20-30%
- editor route ยังใช้งานได้ครบ
- admin chart/export ไม่เพิ่ม bundle ให้ public routes

### 4.6 Fonts, PWA, Cache Helper

Tasks:

- เปลี่ยน Google font dependency เป็น local/self-hosted font ถ้าต้องการ build/offline reliability
- แก้ `PWARegistration` ให้ clear interval และลบ state ที่ไม่ได้ใช้
- แก้ `src/lib/cache.ts` ที่ cache hit แล้ว invalidate cache เอง
- เพิ่ม cache helper เฉพาะ query ที่อ่านบ่อยจริง

Acceptance criteria:

- build ไม่พึ่ง network fonts
- ไม่มี interval leak
- cache behavior ถูกต้องและวัดผลได้

## Phase 5: Quality Gates

Objective: ป้องกัน regression หลังแก้

Tasks:

- ตั้ง `npm run lint` เป็น gate หลังลด error สำคัญ
- เพิ่ม TypeScript strict check ที่รันได้จริง
- เพิ่ม API tests สำหรับ auth/admin/upload/ad tracking
- เพิ่ม SQL smoke tests สำหรับ RPC/RLS สำคัญ
- เพิ่ม bundle report หรือ script วัด route JS size
- เพิ่ม `npm audit --omit=dev --audit-level=moderate` ใน release checklist

Suggested checks:

```powershell
npm run build
npm run lint
npm audit --omit=dev --audit-level=moderate
.\node_modules\.bin\supabase.cmd db advisors --linked --type all --level warn --output json
```

Acceptance criteria:

- build ผ่าน
- lint debt ลดลงเป็นลำดับและไม่มี new critical lint
- advisors ไม่มี error ใหม่
- route bundle ไม่โตเกิน budget ที่ตั้งไว้

## Proposed Execution Order

| Sprint | Focus | Output |
| --- | --- | --- |
| Sprint 1 | P0 security | migration hardening + API guards |
| Sprint 2 | DB drift/RLS | segment fix + advisors error cleanup |
| Sprint 3 | API abuse protection | upload/ad tracking/rate limit |
| Sprint 4 | UX/performance pass 1 | header split + feed/search fixes |
| Sprint 5 | UX/performance pass 2 | image/font/editor bundle optimization |
| Sprint 6 | Quality gates | tests, lint cleanup, CI checklist |

## Definition Of Done

งานชุดนี้ถือว่าเสร็จเมื่อ:

- P0/P1 security findings ถูกแก้และมี migration ชัดเจน
- remote schema ไม่ drift จาก migration ที่ตั้งใจ
- Supabase advisors ไม่มี error ระดับสูงที่เกี่ยวกับ public/security exposure
- public upload และ ad tracking abuse ถูก rate limited และ validated
- user-facing bundle baseline ลดลงอย่างเห็นได้ชัด
- feed/search/post detail ไม่มี debug UX หรือข้อมูล inconsistent
- build/lint/audit/advisors มี checklist สำหรับก่อน deploy

## Immediate Next Task

แนะนำให้เริ่มจาก migration ชุดแรก:

1. `revoke_public_rpc_hardening.sql`
2. `fix_delete_user_account_guard.sql`
3. `fix_ad_tracking_rpc_grants.sql`
4. `fix_user_segments_schema_drift.sql`

หลังจาก migration ชุดนี้ผ่าน ค่อยปรับ API routes ให้สอดคล้องและรัน advisors ซ้ำ
