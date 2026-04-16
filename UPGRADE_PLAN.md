# Backend Upgrade Plan (Models → Routes → Controllers → Services → Tests)

## Phase 1: Models Upgrade ✅ STARTING

### Current Model Status
- ✅ User.js - Good (has methods, hooks, indexes)
- ✅ Tenant.js - Good (comprehensive structure)
- ✅ Property.js - Good (nested documents)
- ⚠️ Expense.js - Fair (needs enhancements)
- ⚠️ Invoice.js - Fair (needs enhancements from earlier)
- ⚠️ Subscription.js - Unknown (needs check)
- ⚠️ Organization.js - Good (has SaaS)
- ⚠️ Webhook.js - Unknown (needs check)
- ⚠️ UsageMetrics.js - Unknown (needs check)

### Models to Enhance
1. **User.js** - Add missing methods & validations
2. **Tenant.js** - Add helper methods & validations
3. **Property.js** - Add methods for occupancy calculations
4. **Expense.js** - Add category validation & methods
5. **Invoice.js** - Already enhanced with payment fields
6. **Subscription.js** - Create/enhance subscription tracking
7. **Organization.js** - Already production-ready
8. **Webhook.js** - Ensure webhook delivery tracking
9. **UsageMetrics.js** - Ensure usage tracking

## Phase 2: Routes Upgrade
- Update admin routes to use proper controllers
- Create missing routes for all CRUD operations
- Ensure validation & error handling in all routes

## Phase 3: Controllers Upgrade
- Verify all 8 controllers work properly
- Add missing CRUD operations
- Ensure ResponseFormatter usage
- Add comprehensive error handling

## Phase 4: Services Upgrade
- Update 12 existing services
- Add missing business logic
- Create data processing utilities

## Phase 5: Testing
- Create Jest test suite  
- Test all CRUD operations
- Test all validations
- Test error scenarios

## Timeline
- Models: 30 mins
- Routes: 20 mins
- Controllers: 25 mins
- Services: 25 mins
- Testing: 30 mins

---

## Let's Start!
