# Système de Feed Personnalisé - Gbairai PWA

## Vue d'ensemble

Le système de feed personnalisé utilise un algorithme de recommandation sophistiqué pour présenter les Gbairais les plus pertinents à chaque utilisateur. Il combine plusieurs facteurs : interactions passées, proximité géographique, préférences émotionnelles et tendances en temps réel.

## Architecture du système

### Composants principaux

1. **Algorithme de recommandation** - Calcul des scores de pertinence
2. **Cache intelligent** - Mise en cache multi-niveau avec TTL
3. **Filtres avancés** - Filtrage par émotion, localisation, temps
4. **Système d'interactions** - Tracking des likes, partages, commentaires
5. **Analytics comportementales** - Analyse des patterns utilisateur

## Implémentation technique

### 1. Algorithme de recommandation
```typescript
// server/services/recommendationEngine.ts
interface RecommendationFactors {
  emotionalAffinity: number;
  geographicProximity: number;
  temporalRelevance: number;
  socialSignals: number;
  contentQuality: number;
  userInteractionHistory: number;
}

interface ScoredGbairai {
  gbairai: Gbairai;
  score: number;
  factors: RecommendationFactors;
}

export class RecommendationEngine {
  private static instance: RecommendationEngine;
  private cache: Map<string, ScoredGbairai[]> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();

  static getInstance(): RecommendationEngine {
    if (!this.instance) {
      this.instance = new RecommendationEngine();
    }
    return this.instance;
  }

  async generateFeed(userId: string, options: FeedOptions = {}): Promise<ScoredGbairai[]> {
    const cacheKey = this.generateCacheKey(userId, options);
    
    // Vérifier le cache
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cacheKey)) {
      return cached;
    }

    const userProfile = await this.getUserProfile(userId);
    const candidates = await this.getCandidateGbairais(userProfile, options);
    
    // Calculer les scores pour chaque candidat
    const scoredGbairais = await Promise.all(
      candidates.map(async (gbairai) => {
        const factors = await this.calculateRecommendationFactors(gbairai, userProfile);
        const score = this.calculateOverallScore(factors);
        
        return {
          gbairai,
          score,
          factors
        };
      })
    );

    // Trier par score décroissant
    const sorted = scoredGbairais.sort((a, b) => b.score - a.score);
    
    // Diversifier les résultats
    const diversified = this.diversifyResults(sorted, userProfile);
    
    // Mettre en cache
    this.cache.set(cacheKey, diversified);
    
    return diversified;
  }

  private async calculateRecommendationFactors(
    gbairai: Gbairai,
    userProfile: UserProfile
  ): Promise<RecommendationFactors> {
    const factors: RecommendationFactors = {
      emotionalAffinity: await this.calculateEmotionalAffinity(gbairai, userProfile),
      geographicProximity: await this.calculateGeographicProximity(gbairai, userProfile),
      temporalRelevance: this.calculateTemporalRelevance(gbairai),
      socialSignals: await this.calculateSocialSignals(gbairai),
      contentQuality: await this.calculateContentQuality(gbairai),
      userInteractionHistory: await this.calculateUserInteractionHistory(gbairai, userProfile)
    };

    return factors;
  }

  private async calculateEmotionalAffinity(
    gbairai: Gbairai,
    userProfile: UserProfile
  ): Promise<number> {
    // Calculer l'affinité émotionnelle basée sur l'historique
    const userEmotionPreferences = userProfile.emotionPreferences;
    const gbairaiEmotion = gbairai.emotion;
    
    // Score de base selon les préférences
    let score = userEmotionPreferences[gbairaiEmotion] || 0.5;
    
    // Bonus pour les émotions récemment aimées
    const recentInteractions = userProfile.recentInteractions
      .filter(i => i.type === 'like' && i.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    const recentEmotionCounts = recentInteractions.reduce((acc, interaction) => {
      acc[interaction.gbairai.emotion] = (acc[interaction.gbairai.emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (recentEmotionCounts[gbairaiEmotion]) {
      score += 0.2 * (recentEmotionCounts[gbairaiEmotion] / recentInteractions.length);
    }

    return Math.min(score, 1);
  }

  private async calculateGeographicProximity(
    gbairai: Gbairai,
    userProfile: UserProfile
  ): Promise<number> {
    if (!userProfile.location || !gbairai.location) return 0.3;

    const distance = this.calculateDistance(
      userProfile.location.latitude,
      userProfile.location.longitude,
      gbairai.location.latitude,
      gbairai.location.longitude
    );

    // Score inversement proportionnel à la distance
    if (distance < 5) return 1.0;      // Moins de 5km = score max
    if (distance < 20) return 0.8;     // Moins de 20km = score élevé
    if (distance < 50) return 0.6;     // Moins de 50km = score moyen
    if (distance < 200) return 0.4;    // Moins de 200km = score faible
    return 0.2;                        // Plus de 200km = score minimal
  }

  private calculateTemporalRelevance(gbairai: Gbairai): number {
    const now = new Date();
    const createdAt = new Date(gbairai.createdAt);
    const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Score dégressif avec l'âge
    if (ageHours < 1) return 1.0;      // Moins d'1h = score max
    if (ageHours < 6) return 0.9;      // Moins de 6h = score élevé
    if (ageHours < 24) return 0.7;     // Moins de 24h = score bon
    if (ageHours < 168) return 0.5;    // Moins d'1 semaine = score moyen
    return 0.2;                        // Plus d'1 semaine = score minimal
  }

  private async calculateSocialSignals(gbairai: Gbairai): Promise<number> {
    const interactions = await this.getGbairaiInteractions(gbairai.id);
    
    const likes = interactions.filter(i => i.type === 'like').length;
    const comments = interactions.filter(i => i.type === 'comment').length;
    const shares = interactions.filter(i => i.type === 'share').length;
    
    // Calculer le score social pondéré
    const socialScore = (likes * 1 + comments * 2 + shares * 3) / 10;
    
    return Math.min(socialScore, 1);
  }

  private async calculateContentQuality(gbairai: Gbairai): Promise<number> {
    let score = 0.5; // Score de base
    
    // Bonus pour la longueur appropriée
    const length = gbairai.content.length;
    if (length >= 20 && length <= 200) {
      score += 0.2;
    } else if (length > 200) {
      score -= 0.1;
    }
    
    // Bonus pour la présence de termes nouchi
    const nouchTerms = this.detectNouchTerms(gbairai.content);
    if (nouchTerms.length > 0) {
      score += 0.1 * Math.min(nouchTerms.length, 3);
    }
    
    // Malus pour contenu répétitif
    if (this.isRepetitiveContent(gbairai.content)) {
      score -= 0.3;
    }
    
    return Math.max(Math.min(score, 1), 0);
  }

  private async calculateUserInteractionHistory(
    gbairai: Gbairai,
    userProfile: UserProfile
  ): Promise<number> {
    // Vérifier si l'utilisateur a déjà interagi avec ce contenu
    const hasInteracted = userProfile.recentInteractions.some(
      i => i.gbairai.id === gbairai.id
    );
    
    if (hasInteracted) return 0; // Éviter les doublons
    
    // Bonus pour les auteurs avec qui l'utilisateur interagit souvent
    const authorInteractions = userProfile.recentInteractions.filter(
      i => i.gbairai.userId === gbairai.userId
    );
    
    if (authorInteractions.length > 0) {
      return 0.3 + (authorInteractions.length * 0.1);
    }
    
    return 0.5; // Score neutre pour nouveau contenu
  }

  private calculateOverallScore(factors: RecommendationFactors): number {
    // Poids pour chaque facteur
    const weights = {
      emotionalAffinity: 0.25,
      geographicProximity: 0.20,
      temporalRelevance: 0.15,
      socialSignals: 0.20,
      contentQuality: 0.10,
      userInteractionHistory: 0.10
    };

    return Object.entries(factors).reduce((total, [key, value]) => {
      return total + (value * weights[key as keyof RecommendationFactors]);
    }, 0);
  }

  private diversifyResults(
    scored: ScoredGbairai[],
    userProfile: UserProfile
  ): ScoredGbairai[] {
    const diversified: ScoredGbairai[] = [];
    const emotionCounts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};
    const maxPerCategory = 3;

    for (const item of scored) {
      const emotion = item.gbairai.emotion;
      const region = item.gbairai.location?.region || 'unknown';
      
      // Limiter le nombre d'éléments par émotion et région
      if (
        (emotionCounts[emotion] || 0) < maxPerCategory &&
        (regionCounts[region] || 0) < maxPerCategory
      ) {
        diversified.push(item);
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      }
      
      if (diversified.length >= 50) break; // Limiter à 50 éléments
    }

    return diversified;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
```

### 2. Profil utilisateur
```typescript
// server/services/userProfile.ts
interface UserProfile {
  userId: string;
  emotionPreferences: Record<string, number>;
  location: LocationData;
  recentInteractions: UserInteraction[];
  contentPreferences: ContentPreferences;
  lastUpdated: Date;
}

interface ContentPreferences {
  preferredLanguage: string;
  contentTypes: string[];
  blockedUsers: string[];
  favoriteRegions: string[];
}

export class UserProfileService {
  private static instance: UserProfileService;
  private profiles: Map<string, UserProfile> = new Map();

  static getInstance(): UserProfileService {
    if (!this.instance) {
      this.instance = new UserProfileService();
    }
    return this.instance;
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    let profile = this.profiles.get(userId);
    
    if (!profile || this.isProfileStale(profile)) {
      profile = await this.buildUserProfile(userId);
      this.profiles.set(userId, profile);
    }
    
    return profile;
  }

  private async buildUserProfile(userId: string): Promise<UserProfile> {
    const user = await storage.getUser(userId);
    const recentInteractions = await this.getRecentInteractions(userId);
    const emotionPreferences = this.calculateEmotionPreferences(recentInteractions);
    
    return {
      userId,
      emotionPreferences,
      location: user.location || null,
      recentInteractions,
      contentPreferences: user.contentPreferences || {
        preferredLanguage: 'fr-ci',
        contentTypes: ['gbairai'],
        blockedUsers: [],
        favoriteRegions: []
      },
      lastUpdated: new Date()
    };
  }

  private calculateEmotionPreferences(interactions: UserInteraction[]): Record<string, number> {
    const emotionCounts: Record<string, number> = {};
    const totalInteractions = interactions.length;

    if (totalInteractions === 0) {
      // Préférences par défaut
      return {
        joie: 0.7,
        calme: 0.6,
        amour: 0.5,
        suspens: 0.4,
        tristesse: 0.3,
        colere: 0.2,
        inclassable: 0.1
      };
    }

    // Compter les interactions par émotion
    interactions.forEach(interaction => {
      const emotion = interaction.gbairai.emotion;
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    // Normaliser les scores
    const preferences: Record<string, number> = {};
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      preferences[emotion] = count / totalInteractions;
    });

    return preferences;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const profile = await this.getUserProfile(userId);
    const updatedProfile = { ...profile, ...updates, lastUpdated: new Date() };
    this.profiles.set(userId, updatedProfile);
  }

  private isProfileStale(profile: UserProfile): boolean {
    const staleThreshold = 60 * 60 * 1000; // 1 heure
    return Date.now() - profile.lastUpdated.getTime() > staleThreshold;
  }
}
```

### 3. Système de cache intelligent
```typescript
// server/services/cacheService.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hitCount = 0;
  private missCount = 0;

  static getInstance(): CacheService {
    if (!this.instance) {
      this.instance = new CacheService();
    }
    return this.instance;
  }

  set<T>(key: string, data: T, ttl: number = 300000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key
    };
    
    this.cache.set(key, entry);
    this.cleanup();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }
    
    this.hitCount++;
    return entry.data;
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  getStats(): { hitRate: number; size: number; hitCount: number; missCount: number } {
    const totalRequests = this.hitCount + this.missCount;
    return {
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount
    };
  }

  private cleanup(): void {
    if (this.cache.size > 1000) {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      this.cache.forEach((entry, key) => {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => this.cache.delete(key));
    }
  }
}
```

### 4. Composant Feed Frontend
```typescript
// client/src/components/Feed/PersonalizedFeed.tsx
interface PersonalizedFeedProps {
  userId: string;
  filters?: FeedFilters;
  onGbairaiClick: (gbairai: Gbairai) => void;
}

const PersonalizedFeed: React.FC<PersonalizedFeedProps> = ({
  userId,
  filters,
  onGbairaiClick
}) => {
  const [gbairais, setGbairais] = useState<ScoredGbairai[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['feed', userId, filters, page],
    queryFn: async () => {
      const response = await fetch(`/api/feed/personal?page=${page}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du feed');
      }
      
      return response.json();
    },
    staleTime: 60000, // 1 minute
    enabled: !!userId
  });

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/feed/personal?page=${page + 1}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters })
      });
      
      const newData = await response.json();
      
      if (newData.gbairais.length === 0) {
        setHasMore(false);
      } else {
        setGbairais(prev => [...prev, ...newData.gbairais]);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Erreur chargement page suivante:', error);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, loading, filters]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Intersection observer pour l'infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  if (isLoading && page === 1) {
    return <FeedSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Erreur lors du chargement du feed</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="feed-container">
      {/* Pull to refresh */}
      <div 
        className={`pull-to-refresh ${refreshing ? 'refreshing' : ''}`}
        onTouchStart={handleRefresh}
      >
        {refreshing && <div className="refresh-indicator">Actualisation...</div>}
      </div>

      {/* Liste des Gbairais */}
      <div className="space-y-4">
        {gbairais.map((item, index) => (
          <GbairaiCard
            key={item.gbairai.id}
            gbairai={item.gbairai}
            score={item.score}
            factors={item.factors}
            onClick={() => onGbairaiClick(item.gbairai)}
            showRecommendationInfo={true}
          />
        ))}
      </div>

      {/* Sentinel pour infinite scroll */}
      <div id="scroll-sentinel" className="h-4">
        {loading && hasMore && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        )}
      </div>

      {/* Fin du feed */}
      {!hasMore && gbairais.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Vous avez vu tous les Gbairais disponibles</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Actualiser
          </button>
        </div>
      )}
    </div>
  );
};
```

## API Routes

### Routes du feed
```typescript
// server/routes/feed.ts
import { RecommendationEngine } from '../services/recommendationEngine';
import { UserProfileService } from '../services/userProfile';
import { CacheService } from '../services/cacheService';

const router = express.Router();
const recommendationEngine = RecommendationEngine.getInstance();
const userProfileService = UserProfileService.getInstance();
const cacheService = CacheService.getInstance();

// Feed personnalisé
router.post('/personal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { filters, page = 1, limit = 20 } = req.body;
    
    const cacheKey = `feed:${userId}:${JSON.stringify(filters)}:${page}`;
    
    // Vérifier le cache
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Générer le feed
    const scoredGbairais = await recommendationEngine.generateFeed(userId, {
      ...filters,
      page,
      limit
    });
    
    const result = {
      gbairais: scoredGbairais,
      page,
      hasMore: scoredGbairais.length === limit,
      total: scoredGbairais.length
    };
    
    // Mettre en cache
    cacheService.set(cacheKey, result, 300000); // 5 minutes
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trending
router.get('/trending', async (req, res) => {
  try {
    const { limit = 20, timeframe = '24h' } = req.query;
    
    const cacheKey = `trending:${timeframe}:${limit}`;
    const cached = cacheService.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    const trending = await getTrendingGbairais(timeframe, parseInt(limit));
    
    cacheService.set(cacheKey, trending, 600000); // 10 minutes
    
    res.json(trending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Nearby
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, limit = 20 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Coordonnées requises' });
    }
    
    const nearby = await getNearbyGbairais(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius),
      parseInt(limit)
    );
    
    res.json(nearby);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enregistrer une interaction
router.post('/interact', authenticateToken, async (req, res) => {
  try {
    const { gbairaiId, type, content } = req.body;
    const userId = req.user.id;
    
    const interaction = await storage.createInteraction({
      userId,
      gbairaiId,
      type,
      content
    });
    
    // Invalider le cache du feed utilisateur
    cacheService.invalidatePattern(`feed:${userId}:.*`);
    
    // Mettre à jour le profil utilisateur
    await userProfileService.updateUserProfile(userId, {
      recentInteractions: [...(await userProfileService.getUserProfile(userId)).recentInteractions, interaction]
    });
    
    res.json(interaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## Analytics et optimisation

### Métriques de performance
```typescript
// server/services/feedAnalytics.ts
export class FeedAnalytics {
  private static instance: FeedAnalytics;
  private metrics: Map<string, number> = new Map();

  static getInstance(): FeedAnalytics {
    if (!this.instance) {
      this.instance = new FeedAnalytics();
    }
    return this.instance;
  }

  trackFeedGeneration(userId: string, duration: number, itemCount: number): void {
    this.metrics.set(`feed_generation_${userId}`, duration);
    this.metrics.set(`feed_size_${userId}`, itemCount);
  }

  trackUserInteraction(userId: string, gbairaiId: string, type: string): void {
    const key = `interaction_${type}_${userId}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  getAverageMetrics(): {
    averageFeedSize: number;
    averageGenerationTime: number;
    totalInteractions: number;
  } {
    const feedSizes = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith('feed_size_'))
      .map(([, value]) => value);
    
    const generationTimes = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith('feed_generation_'))
      .map(([, value]) => value);
    
    const interactions = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith('interaction_'))
      .reduce((sum, [, value]) => sum + value, 0);

    return {
      averageFeedSize: feedSizes.reduce((a, b) => a + b, 0) / feedSizes.length || 0,
      averageGenerationTime: generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length || 0,
      totalInteractions: interactions
    };
  }
}
```

Ce système de feed personnalisé offre une expérience utilisateur hautement personnalisée qui s'adapte aux préférences individuelles tout en maintenant la diversité du contenu et les performances optimales.