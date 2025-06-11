# Replicate Models Analysis - Current Usage and Cost-Effective Alternatives

## Currently Used Models

Based on codebase analysis, StillMotion.ai currently uses three Replicate models:

### 1. **Fast Generation Model**
- **Model**: `wavespeedai/wan-2.1-i2v-480p`
- **Purpose**: Default fast generation option
- **Credits charged**: 2 credits per generation
- **Features**: 480p resolution, faster processing time
- **Estimated cost**: ~$0.125 per video (based on WaveSpeedAI pricing)

### 2. **Slow Generation Model**
- **Model**: `kwaivgi/kling-v1.6-standard:c1b16805f929c47270691c7158f1e892dcaf3344b8d19fcd7475e525853b8b2c`
- **Purpose**: Slow and good quality option
- **Credits charged**: 1 credit per generation
- **Features**: Higher quality output, longer processing time
- **Estimated cost**: ~$0.45 per video (based on similar Kling models)

### 3. **Prompt Enhancement Model**
- **Model**: `yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb`
- **Purpose**: Optional prompt enhancement using LLaVA-13B
- **Usage**: Enhances user prompts before video generation
- **Cost**: Additional processing time on top of video generation

## Current Implementation Details

The system has a fallback mechanism:
1. Primary API (external service) is tried first for fast generation
2. If Primary API fails or is unavailable, falls back to Replicate
3. Slow generation always uses Replicate (Kling model)

## Cost-Effective Alternative Models on Replicate

### 1. **MiniMax/Video-01 (Hailuo)**
- **Cost**: ~$0.50 per video
- **Features**: 
  - 720p resolution at 25fps
  - 6-second videos
  - Cinematic camera movement effects
  - Both text-to-video and image-to-video support
- **Advantages**: Higher resolution than current 480p model
- **Disadvantages**: More expensive than current models

### 2. **Wan 2.1 1.3B Model**
- **Model**: `wan-video/wan-2.1-1.3b`
- **Features**:
  - Smaller model (1.3B parameters vs 14B)
  - Designed for consumer GPUs
  - Only requires 8.19 GB VRAM
  - Generates 5-second 480p video in ~4 minutes on RTX 4090
- **Potential advantage**: Likely cheaper due to lower resource requirements

### 3. **Wan 2.1 720p Models**
- **Models**: 
  - `wavespeedai/wan-2.1-i2v-720p` (image-to-video)
  - `wavespeedai/wan-2.1-t2v-720p` (text-to-video)
- **Features**: Higher resolution (720p vs current 480p)
- **Processing time**: ~150 seconds for 5s video

## Recommendations for Cost Optimization

### 1. **Consider the Wan 2.1 1.3B Model**
- Replace the current fast generation model with `wan-video/wan-2.1-1.3b`
- Lower computational requirements should result in lower costs
- Maintains compatibility with the Wan 2.1 ecosystem

### 2. **Implement Dynamic Model Selection**
- Use 480p models for preview/draft generations
- Offer 720p as a premium option (3-4 credits)
- Keep the 1.3B model as a budget option

### 3. **Optimize Prompt Enhancement**
- Consider making LLaVA enhancement a premium feature
- Or replace with a lighter-weight prompt enhancement model

### 4. **Pricing Structure Adjustment**
Based on actual costs:
- Fast & Great (480p): Keep at 2 credits
- Budget Option (1.3B model): 1 credit
- Premium (720p): 3-4 credits
- Slow & Good (Kling): Keep at 1 credit but note it's actually more expensive

### 5. **Monitor Usage Patterns**
- Track which models users prefer
- Analyze cost per generation for each model
- Adjust credit pricing based on actual costs

## Implementation Notes

To implement model changes, update these locations:
- `/src/app/api/generate-video/route.ts` - Lines 16-18 for model versions
- Consider adding model selection to the generation request
- Update iOS app models if offering multiple quality tiers

## Additional Considerations

1. **Replicate Pricing Model**: Pay-per-second based on hardware used
2. **Volume Discounts**: Available for large usage - contact sales@replicate.com
3. **Alternative Platforms**: Consider RunPod or FluidStack for self-hosting if volume justifies it