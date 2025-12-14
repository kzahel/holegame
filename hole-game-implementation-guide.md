# Implementing a "Hole Game" Mechanic: A Comprehensive Technical Guide

*Based on analysis of Donut County and similar implementations*

---

## Executive Summary

Creating a polished hole-swallowing game mechanic (as seen in Donut County) is deceptively complex. What appears to be a simple "stencil cut + physics simulation" is actually a carefully orchestrated illusion combining rendering tricks, custom physics behavior, and significant optimization. This document provides detailed implementation guidance for achieving a similar feel.

---

## Part 1: The Rendering System

### 1.1 The Core Illusion

The hole is **not** a true geometric void in the ground mesh. Instead, it's a visual illusion created using the **stencil buffer**. This approach has several advantages:

- No mesh deformation required at runtime
- Works on any surface without modification
- Clean visual result without artifacts
- Performant (no geometry recalculation)

### 1.2 Stencil Buffer Technique

The stencil buffer is an 8-bit per-pixel buffer that can mark regions of the screen for special treatment. The hole effect uses two shaders working together:

**Shader 1: The Hole Mask (Invisible, but writes to stencil)**

```hlsl
Shader "HoleGame/HoleMask"
{
    Properties
    {
        _StencilRef ("Stencil Reference", Int) = 1
    }
    
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry-1" }
        
        // Don't render any color - this is invisible
        ColorMask 0
        
        // Don't write to depth buffer (prevents occluding objects)
        ZWrite Off
        
        Stencil
        {
            Ref [_StencilRef]
            Comp Always
            Pass Replace
        }
        
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            struct appdata
            {
                float4 vertex : POSITION;
            };
            
            struct v2f
            {
                float4 pos : SV_POSITION;
            };
            
            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                return o;
            }
            
            half4 frag(v2f i) : SV_Target
            {
                return 0; // Color doesn't matter - we're not rendering
            }
            ENDCG
        }
    }
}
```

**Shader 2: The Ground Surface (Masked by stencil)**

```hlsl
Shader "HoleGame/GroundWithHole"
{
    Properties
    {
        _Color ("Color", Color) = (1,1,1,1)
        _StencilRef ("Stencil Reference", Int) = 1
    }
    
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        
        Stencil
        {
            Ref [_StencilRef]
            Comp NotEqual  // Only draw where stencil != our reference
            Pass Keep
        }
        
        Pass
        {
            // Standard rendering pass here
            // ...
        }
    }
}
```

### 1.3 Creating the Hole Interior

To make the hole appear deep (not just a cut-out), you need an **inverted cylinder** or **sphere** beneath the hole mask. This object:

- Uses **backface culling disabled** (Cull Off) or **front-face culling** (Cull Front)
- Renders only where the stencil mask is active
- Shows the "inside" of the shape, creating depth

**Shader 3: The Hole Interior (Visible only through stencil)**

```hlsl
Shader "HoleGame/HoleInterior"
{
    Properties
    {
        _Color ("Color", Color) = (0.1, 0.1, 0.1, 1)
        _StencilRef ("Stencil Reference", Int) = 1
    }
    
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry+1" }
        
        // Show backfaces (inside of mesh)
        Cull Front
        
        Stencil
        {
            Ref [_StencilRef]
            Comp Equal  // Only draw where stencil == reference
            Pass Keep
        }
        
        Pass
        {
            // Dark interior rendering
            // ...
        }
    }
}
```

### 1.4 Render Order (Critical)

The render queue order is essential:

1. **Geometry-1**: Hole mask (writes stencil, invisible)
2. **Geometry**: Ground plane (masked by stencil)
3. **Geometry+1**: Hole interior (visible through stencil)
4. **Geometry+2**: Regular objects

In URP, you may need to use **Renderer Features** to control stencil behavior since Shader Graph doesn't expose stencil controls directly.

---

## Part 2: The Physics System

### 2.1 The Key Insight: It's NOT Real Physics

A common mistake is trying to simulate realistic rigid body physics of objects falling through a circular hole. This leads to:

- Jank (objects getting stuck on edges)
- Unpredictable behavior
- Performance issues from continuous collision detection

**Donut County's approach**: Once an object is determined to "fit," it transitions from world physics to a **scripted swallowing animation**. The physics simulation stops, and a controlled descent begins.

### 2.2 The "Does It Fit?" Check

Use **bounding box comparison**, not physics collision:

```csharp
public class HoleController : MonoBehaviour
{
    public float holeRadius = 1f;
    
    public bool ObjectFits(GameObject obj)
    {
        Bounds bounds = GetObjectBounds(obj);
        
        // Use the LARGER of width/depth as the effective size
        float objectSize = Mathf.Max(bounds.size.x, bounds.size.z);
        
        // Be forgiving - use 90% of hole diameter
        return objectSize < (holeRadius * 2f * 0.9f);
    }
    
    private Bounds GetObjectBounds(GameObject obj)
    {
        // Combine all renderers' bounds
        Renderer[] renderers = obj.GetComponentsInChildren<Renderer>();
        
        if (renderers.Length == 0)
            return new Bounds(obj.transform.position, Vector3.one * 0.1f);
        
        Bounds combined = renderers[0].bounds;
        for (int i = 1; i < renderers.Length; i++)
        {
            combined.Encapsulate(renderers[i].bounds);
        }
        
        return combined;
    }
}
```

### 2.3 The Swallowing Transition

When an object fits and is over the hole:

1. **Disable physics** (set Rigidbody to kinematic or disable it)
2. **Parent to hole** (optional, for movement)
3. **Play descent animation** (tilt, slide to center, sink)
4. **Increase hole size** based on object mass/volume
5. **Destroy or pool** the object

```csharp
public class SwallowableObject : MonoBehaviour
{
    private Rigidbody rb;
    private bool isBeingSwallowed = false;
    private HoleController hole;
    
    public float swallowDuration = 0.5f;
    public AnimationCurve descentCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);
    
    public void StartSwallowing(HoleController targetHole)
    {
        if (isBeingSwallowed) return;
        
        isBeingSwallowed = true;
        hole = targetHole;
        
        // Disable physics
        rb = GetComponent<Rigidbody>();
        if (rb != null)
        {
            rb.isKinematic = true;
            rb.velocity = Vector3.zero;
            rb.angularVelocity = Vector3.zero;
        }
        
        StartCoroutine(SwallowAnimation());
    }
    
    private IEnumerator SwallowAnimation()
    {
        Vector3 startPos = transform.position;
        Quaternion startRot = transform.rotation;
        
        // Target: center of hole, tilted, below surface
        Vector3 holeCenter = hole.transform.position;
        Vector3 endPos = holeCenter + Vector3.down * 3f;
        
        // Add a random tilt for visual interest
        Quaternion tiltRot = Quaternion.Euler(
            Random.Range(-30f, 30f), 
            Random.Range(0f, 360f), 
            Random.Range(-30f, 30f)
        );
        
        float elapsed = 0f;
        
        while (elapsed < swallowDuration)
        {
            elapsed += Time.deltaTime;
            float t = descentCurve.Evaluate(elapsed / swallowDuration);
            
            // Slide toward center first, then descend
            float slideT = Mathf.Clamp01(t * 2f);
            float sinkT = Mathf.Clamp01((t - 0.3f) / 0.7f);
            
            Vector3 centeredPos = Vector3.Lerp(startPos, 
                new Vector3(holeCenter.x, startPos.y, holeCenter.z), 
                slideT);
            
            transform.position = Vector3.Lerp(centeredPos, endPos, sinkT);
            transform.rotation = Quaternion.Slerp(startRot, tiltRot, t);
            
            yield return null;
        }
        
        // Notify hole to grow
        hole.OnObjectSwallowed(this);
        
        // Destroy or pool
        Destroy(gameObject);
    }
}
```

### 2.4 Object-Specific Gravity (Ben Esposito's Insight)

From interviews with the Donut County developer:

> "Everyone probably understands that a giant object that is falling appears to fall slower, even though it's being pulled down at the same rate as a small object, because it looks so huge. But that's not how people think it's supposed to work in a game. They freak out when a building appears to not be falling very fast into the hole. **So gravity is actually local to every single object in the game, and big objects have way more gravity than everything else.**"

```csharp
public class CustomGravityObject : MonoBehaviour
{
    public float gravityMultiplier = 1f;
    
    [Header("Auto-calculated based on size")]
    public bool autoCalculateGravity = true;
    public float sizeGravityFactor = 2f;
    
    private Rigidbody rb;
    
    void Start()
    {
        rb = GetComponent<Rigidbody>();
        rb.useGravity = false;
        
        if (autoCalculateGravity)
        {
            // Larger objects get stronger gravity
            Bounds bounds = GetCombinedBounds();
            float size = Mathf.Max(bounds.size.x, bounds.size.y, bounds.size.z);
            gravityMultiplier = 1f + (size * sizeGravityFactor);
        }
    }
    
    void FixedUpdate()
    {
        if (!rb.isKinematic)
        {
            rb.AddForce(Physics.gravity * gravityMultiplier, ForceMode.Acceleration);
        }
    }
}
```

---

## Part 3: Performance Optimization

### 3.1 Physics Optimization Strategies

From the Donut County Android port, the team at Pingle Studio documented these critical optimizations:

**3.1.1 Collider Simplification**

```
CRITICAL: Replace Mesh Colliders with primitive colliders wherever possible.

Performance hierarchy (fastest to slowest):
1. Sphere Collider
2. Capsule Collider
3. Box Collider
4. Compound primitive colliders
5. Convex Mesh Collider
6. Non-convex Mesh Collider (avoid!)
```

**3.1.2 Rigidbody Sleeping**

Objects at rest should sleep to avoid physics calculations:

```csharp
public class PhysicsOptimizer : MonoBehaviour
{
    void Start()
    {
        // Configure rigidbodies to sleep aggressively
        Rigidbody[] bodies = FindObjectsOfType<Rigidbody>();
        foreach (var rb in bodies)
        {
            rb.sleepThreshold = 0.1f; // Higher = sleeps faster
        }
    }
}
```

**3.1.3 Selective Physics Activation**

Only activate physics for objects near the hole:

```csharp
public class ProximityPhysicsActivator : MonoBehaviour
{
    public float activationRadius = 5f;
    public Transform hole;
    
    private List<PhysicsObject> allObjects = new List<PhysicsObject>();
    
    void Update()
    {
        foreach (var obj in allObjects)
        {
            float distance = Vector3.Distance(
                obj.transform.position, 
                hole.position
            );
            
            bool shouldBeActive = distance < activationRadius;
            
            if (obj.rigidbody != null)
            {
                if (shouldBeActive && obj.rigidbody.IsSleeping())
                {
                    obj.rigidbody.WakeUp();
                }
                else if (!shouldBeActive && !obj.rigidbody.IsSleeping())
                {
                    obj.rigidbody.Sleep();
                }
            }
        }
    }
}
```

**3.1.4 Collision Matrix Optimization**

Configure Physics settings to minimize unnecessary collision checks:

```
Project Settings > Physics > Layer Collision Matrix

Recommended layers:
- Ground (collides with: Objects)
- Objects (collides with: Ground, Objects, Hole)
- Hole (collides with: Objects only)
- SwallowedObjects (collides with: nothing)
```

### 3.2 Rendering Optimization

**3.2.1 Material Batching**

From the port team: "Almost every model had up to 10 different materials... We decided to leave one material per model."

Use **texture atlases** for simple colored objects:

```csharp
// Script to generate color atlas at build time
public class ColorAtlasGenerator
{
    public static Texture2D GenerateColorAtlas(Color[] colors, int cellSize = 4)
    {
        int gridSize = Mathf.CeilToInt(Mathf.Sqrt(colors.Length));
        int texSize = gridSize * cellSize;
        
        Texture2D atlas = new Texture2D(texSize, texSize, TextureFormat.RGBA32, false);
        
        for (int i = 0; i < colors.Length; i++)
        {
            int x = (i % gridSize) * cellSize;
            int y = (i / gridSize) * cellSize;
            
            for (int px = 0; px < cellSize; px++)
            {
                for (int py = 0; py < cellSize; py++)
                {
                    atlas.SetPixel(x + px, y + py, colors[i]);
                }
            }
        }
        
        atlas.filterMode = FilterMode.Point;
        atlas.Apply();
        return atlas;
    }
}
```

**3.2.2 Shader Simplification**

Use mobile-optimized shaders. Replace:
- Standard Shader → Mobile/Diffuse or Unlit
- Complex PBR → Simple solid colors
- Real-time shadows → Baked or faked

---

## Part 4: The Hole Collider

### 4.1 The 2D Polygon Trick

Creating a 3D collider with a hole is challenging. One proven approach:

Use a **2D PolygonCollider2D** configured as a ring shape, then use it for 3D collision detection:

```csharp
public class HoleColliderGenerator : MonoBehaviour
{
    public float outerRadius = 5f;
    public float innerRadius = 1f;
    public int segments = 32;
    
    void Start()
    {
        GenerateHoleCollider();
    }
    
    void GenerateHoleCollider()
    {
        PolygonCollider2D poly = gameObject.AddComponent<PolygonCollider2D>();
        
        // Create two paths: outer boundary and inner hole
        Vector2[] outerPath = GenerateCircle(outerRadius, segments);
        Vector2[] innerPath = GenerateCircle(innerRadius, segments);
        
        // Reverse inner path for proper hole behavior
        System.Array.Reverse(innerPath);
        
        poly.pathCount = 2;
        poly.SetPath(0, outerPath);
        poly.SetPath(1, innerPath);
    }
    
    Vector2[] GenerateCircle(float radius, int segs)
    {
        Vector2[] points = new Vector2[segs];
        for (int i = 0; i < segs; i++)
        {
            float angle = (i / (float)segs) * Mathf.PI * 2f;
            points[i] = new Vector2(
                Mathf.Cos(angle) * radius,
                Mathf.Sin(angle) * radius
            );
        }
        return points;
    }
}
```

### 4.2 Alternative: Compound Collider Approach

Use multiple box colliders arranged in a ring:

```csharp
public class CompoundHoleCollider : MonoBehaviour
{
    public float holeRadius = 1f;
    public float groundSize = 10f;
    public int segments = 8;
    
    void GenerateCompoundCollider()
    {
        float segmentAngle = 360f / segments;
        float segmentWidth = holeRadius * 2f * Mathf.Sin(segmentAngle * 0.5f * Mathf.Deg2Rad);
        
        for (int i = 0; i < segments; i++)
        {
            GameObject segment = new GameObject($"HoleSegment_{i}");
            segment.transform.parent = transform;
            
            BoxCollider box = segment.AddComponent<BoxCollider>();
            
            float angle = i * segmentAngle;
            float distance = (groundSize + holeRadius) * 0.5f;
            
            segment.transform.localPosition = new Vector3(
                Mathf.Cos(angle * Mathf.Deg2Rad) * distance,
                0,
                Mathf.Sin(angle * Mathf.Deg2Rad) * distance
            );
            
            segment.transform.localRotation = Quaternion.Euler(0, -angle, 0);
            
            box.size = new Vector3(
                segmentWidth,
                1f,
                (groundSize - holeRadius) * 0.5f
            );
        }
    }
}
```

---

## Part 5: Edge Behavior and Polish

### 5.1 Edge Nudging

Objects near the hole edge should be subtly pulled toward the center:

```csharp
public class HoleEdgeAttractor : MonoBehaviour
{
    public float attractionRadius = 2f;
    public float attractionStrength = 5f;
    public float edgeTolerance = 0.3f;
    
    void FixedUpdate()
    {
        Collider[] nearby = Physics.OverlapSphere(
            transform.position, 
            attractionRadius
        );
        
        foreach (var col in nearby)
        {
            Rigidbody rb = col.attachedRigidbody;
            if (rb == null || rb.isKinematic) continue;
            
            Vector3 toCenter = transform.position - rb.position;
            toCenter.y = 0;
            
            float distance = toCenter.magnitude;
            
            // Only attract if object is partially over hole
            if (distance < holeRadius + edgeTolerance && distance > 0.1f)
            {
                float strength = attractionStrength * (1f - distance / attractionRadius);
                rb.AddForce(toCenter.normalized * strength, ForceMode.Acceleration);
            }
        }
    }
}
```

### 5.2 Hole Scaling Animation

Smooth growth animation when swallowing objects:

```csharp
public class HoleSizeController : MonoBehaviour
{
    public float currentRadius = 0.5f;
    public float targetRadius = 0.5f;
    public float growthSpeed = 2f;
    public AnimationCurve growthCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);
    
    private float growthProgress = 1f;
    private float startRadius;
    
    public void GrowBy(float amount)
    {
        startRadius = currentRadius;
        targetRadius = currentRadius + amount;
        growthProgress = 0f;
    }
    
    void Update()
    {
        if (growthProgress < 1f)
        {
            growthProgress += Time.deltaTime * growthSpeed;
            float t = growthCurve.Evaluate(Mathf.Clamp01(growthProgress));
            currentRadius = Mathf.Lerp(startRadius, targetRadius, t);
            
            UpdateVisuals();
        }
    }
    
    void UpdateVisuals()
    {
        // Scale the hole mask mesh
        transform.localScale = Vector3.one * currentRadius * 2f;
        
        // Update collider
        // Update any materials that need radius information
    }
}
```

---

## Part 6: Complete Component Architecture

### 6.1 Recommended Component Structure

```
HoleSystem/
├── HoleController.cs           - Main orchestrator
├── HoleRenderer.cs             - Stencil/shader management
├── HolePhysics.cs              - Collider and physics detection
├── HoleSizeManager.cs          - Growth and scaling
└── HoleInputHandler.cs         - Player control

SwallowableObjects/
├── SwallowableObject.cs        - Base component for all objects
├── SwallowAnimation.cs         - Descent animation handling
└── ObjectGravity.cs            - Custom gravity per object

Optimization/
├── PhysicsProximityManager.cs  - Activate/deactivate physics
├── ObjectPoolManager.cs        - Pool swallowed objects
└── LODController.cs            - Level of detail management
```

### 6.2 Detection Flow

```
1. HolePhysics detects object overlap (OnTriggerStay or proximity check)
2. HoleController.TrySwallow(object) called
3. Check: ObjectFits(object) using bounding box comparison
4. If fits && object is positioned over hole center:
   a. SwallowableObject.StartSwallowing() called
   b. Object physics disabled
   c. SwallowAnimation plays
   d. HoleSizeManager.GrowBy(objectSize)
   e. Object destroyed/pooled
5. If doesn't fit:
   - Object bounces naturally off hole edge collider
```

---

## Part 7: Common Pitfalls and Solutions

### 7.1 Pitfall: Objects Get Stuck on Edges

**Cause**: Physics simulation trying to balance objects on hole rim
**Solution**: 
- Use edge attraction (section 5.1)
- Make "fits" check slightly generous
- Add small random forces to teetering objects

### 7.2 Pitfall: Jittery/Janky Movement

**Cause**: Fighting between physics and scripted behavior
**Solution**: 
- Fully commit to scripted animation once swallowing starts
- Set rigidbody to kinematic immediately
- Use FixedUpdate for physics, Update for animations

### 7.3 Pitfall: Objects Clip Through Ground

**Cause**: High velocity + discrete collision detection
**Solution**:
- Use continuous collision detection for fast objects
- Limit fall velocities
- Use thicker ground collider

### 7.4 Pitfall: Poor Performance with Many Objects

**Cause**: All rigidbodies active simultaneously
**Solution**:
- Proximity-based physics activation (section 3.1.3)
- Aggressive sleep thresholds
- Object pooling for swallowed objects

### 7.5 Pitfall: Hole Doesn't Look Like a Hole

**Cause**: Stencil render order issues
**Solution**:
- Double-check Queue values
- Ensure hole mask renders BEFORE ground
- Verify stencil reference values match

---

## Summary: Key Implementation Principles

1. **The hole is an illusion** - Use stencil buffer, not geometry modification

2. **Size checking is simple** - Bounding box vs circle, not physics collision

3. **Swallowing is scripted** - Disable physics, play animation, don't simulate

4. **Gravity is per-object** - Bigger objects fall "faster" (stronger gravity)

5. **Performance requires care** - Sleeping, proximity activation, simple colliders

6. **Polish is in the details** - Edge nudging, smooth scaling, satisfying animations

7. **Don't fight physics** - Work with it or replace it entirely, never halfway

---

*This document synthesizes technical information from developer interviews, porting case studies, and rendering tutorials related to Donut County and similar implementations.*
