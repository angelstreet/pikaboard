# SpriteEffects Overlay Research

**Task:** #560 — Research SpriteAnimator overlay effects  
**Date:** 2026-02-10  
**Author:** Bulbi 🌱

---

## 1. Approach Comparison

| Approach | Bundle Size | Performance | Ease of Use | Visual Quality | Offline |
|----------|-------------|-------------|-------------|----------------|---------|
| **CSS Animations** | 0 KB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ |
| **Canvas Particles** | ~2-5 KB custom | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |
| **GIF Overlays** | 50-500 KB/each | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ |
| **Lottie** | ~50 KB lib + JSON | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |

### CSS Animations (✅ RECOMMENDED)
**Pros:**
- Zero dependencies, zero bundle cost
- GPU-accelerated (`transform`, `opacity`)
- Easy to add new effects (just CSS + a few DOM elements)
- Works perfectly as a positioned overlay
- Can use CSS custom properties for runtime config (color, speed, density)

**Cons:**
- Complex particle systems harder (but doable with pseudo-elements + multiple animations)
- Less organic randomness than canvas (mitigated with staggered delays)

### Canvas Particles
**Pros:**
- True particle physics, randomness, collision
- Great for dense effects (100+ particles)

**Cons:**
- Needs requestAnimationFrame loop (battery drain on mobile)
- Canvas overlay complicates pointer events (need `pointer-events: none`)
- More code to maintain

### GIF Overlays
**Pros:**
- Dead simple: just an `<img>` with `position: absolute`
- Artists can create custom effects

**Cons:**
- Large file sizes, no dynamic control
- Fixed timing, can't adjust speed/density
- Transparency edges look bad on varied backgrounds

### Lottie
**Pros:**
- Beautiful vector animations from After Effects
- Dynamic color/speed control

**Cons:**
- `lottie-web` is ~50KB gzipped — violates "no heavy libs" constraint
- Overkill for simple particle effects

---

## 2. Recommendation: CSS Animations (primary) + Canvas (optional upgrade)

**Phase 1:** Pure CSS effects — covers 80% of use cases with zero deps.  
**Phase 2 (optional):** Tiny canvas particle engine for dense/physics effects.

---

## 3. API Proposal

```tsx
interface SpriteEffectsProps {
  /** Effect name */
  effect: 'rain' | 'snow' | 'hearts' | 'sparkles' | 'fire' | 'electric' | 'none';
  /** Intensity: fewer or more particles */
  intensity?: 'light' | 'medium' | 'heavy';  // default: 'medium'
  /** Override color */
  color?: string;
  /** Children — typically a SpriteAnimator */
  children: React.ReactNode;
}

// Usage:
<SpriteEffects effect="rain" intensity="heavy">
  <SpriteAnimator agent="pika" animation="idle" />
</SpriteEffects>

<SpriteEffects effect="hearts" intensity="light">
  <SpriteAnimator agent="bulbi" animation="walk" direction="E" />
</SpriteEffects>
```

### Component Structure

```
<div class="sprite-effects-wrapper" style="position: relative; display: inline-block">
  {children}
  <div class="sprite-effects-layer" style="position: absolute; inset: 0; pointer-events: none; overflow: hidden">
    {/* Generated particle elements with CSS animations */}
  </div>
</div>
```

---

## 4. CSS Effect Implementations

### Rain
- 15-40 thin vertical `<div>`s (1-2px wide, 10-20px tall)
- `@keyframes rain-fall`: translateY from -20px to 120%, opacity fade
- Random `animation-delay` and `left` positions
- Color: `rgba(174, 194, 224, 0.6)`

### Snow
- 10-30 circular `<div>`s (3-6px, border-radius: 50%)
- `@keyframes snow-fall`: translateY down + gentle translateX sway (sine-like via multiple keyframe steps)
- Slower than rain, slight horizontal drift
- Color: white with varying opacity

### Hearts
- 8-20 `<div>`s using `❤️` emoji or CSS heart shape
- `@keyframes hearts-rise`: translateY upward + scale from 0.5→1→0 + opacity fade
- Float upward from bottom
- Color: customizable (default pink/red)

### Sparkles
- 12-25 star-shaped elements (CSS `clip-path` or `✨` emoji)
- `@keyframes sparkle`: scale pulse + opacity blink at random positions
- Static position, just twinkle in place
- Color: gold/white

### Fire
- 15-30 circular blurred elements
- `@keyframes fire-rise`: translateY upward + scale shrink + color shift (orange→red→transparent)
- Rise from bottom center
- CSS `filter: blur(2px)` for glow

### Electric
- 8-15 thin lines with `@keyframes electric-flash`: rapid opacity toggle + slight position jitter
- Short duration, sharp timing function (`steps()`)
- Color: cyan/white

---

## 5. Performance Notes

- All animations use `transform` and `opacity` only → composited on GPU
- `will-change: transform, opacity` on particle elements
- `pointer-events: none` on overlay layer
- Particle count scales with `intensity` prop
- `prefers-reduced-motion` media query → disable or reduce to static glow
- Elements are generated once on mount, CSS handles all animation (no JS animation loop)

---

## 6. Implementation Estimate

| Item | Effort |
|------|--------|
| SpriteEffects wrapper component | 1-2 hours |
| CSS animations (6 effects) | 2-3 hours |
| Testing + polish | 1 hour |
| **Total** | **~4-6 hours** |
