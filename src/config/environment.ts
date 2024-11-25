export const DEPLOYMENT_TIER = process.env.DEPLOYMENT_TIER || 'development';

export const config = {
  development: {  // Optimized for lifetime deal hosting
    database: {
      type: 'mysql',  // SQLite could be an option for even lower resource usage
      useJsonFields: false,
      poolSize: 2,    // Minimal connection pool to reduce memory
      connectionTimeout: 10000,
      optimizations: {
        cacheQueries: true,
        minifyOutput: true,
        compressLargeResponses: true
      }
    },
    storage: {
      type: 'local',
      path: './storage',
      optimizations: {
        maxFileSize: '5mb',        // Reasonable limit for notation files
        compressUploads: true,     // Compress files on upload
        cacheControl: 'public, max-age=31536000',  // Aggressive caching
        imageOptimization: {
          enabled: true,
          quality: 80
        }
      }
    },
    cache: {
      type: 'memory',
      ttl: 3600,
      maxSize: '100mb'  // Cap memory usage
    },
    scaling: {
      maxUploadSize: '5mb',
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 50  // Conservative rate limiting
      },
      optimizations: {
        gzipCompression: true,
        minifyAssets: true,
        lazyLoading: true
      }
    }
  },
  production: {  // For when MRR/ARR supports self-hosted infrastructure
    database: {
      type: 'postgresql',
      useJsonFields: true,
      poolSize: 20,
      connectionTimeout: 20000,
      optimizations: {
        preparedStatements: true,
        queryCache: true
      }
    },
    storage: {
      type: 'object-storage',
      provider: process.env.STORAGE_PROVIDER || 's3',
      bucket: process.env.STORAGE_BUCKET,
      region: process.env.STORAGE_REGION,
      cdn: {
        enabled: true,
        domain: process.env.CDN_DOMAIN
      }
    },
    cache: {
      type: 'redis',
      url: process.env.REDIS_URL,
      ttl: 7200
    },
    scaling: {
      maxUploadSize: '50mb',
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 300
      }
    }
  }
}[DEPLOYMENT_TIER];

// Feature flags based on tier
export const features = {
  development: {
    realTimeCollaboration: true,
    complexScoreAnalysis: {
      enabled: true,
      batchProcessing: true,    // Process in background to reduce load
      maxComplexity: 'medium'   // Limit computational intensity
    },
    audioProcessing: {
      quality: 'standard',
      maxDuration: 300,         // 5 minutes max
      format: 'mp3'            // More compressed format
    },
    maxScoreSize: 1000,        // Reasonable limit for most users
    maxAnnotationsPerScore: 200,
    optimizations: {
      progressiveLoading: true, // Load scores in chunks
      asyncRendering: true,     // Render complex elements async
      cacheAggressively: true   // Cache everything possible
    }
  },
  production: {
    realTimeCollaboration: true,
    complexScoreAnalysis: {
      enabled: true,
      batchProcessing: false,   // Real-time processing
      maxComplexity: 'high'
    },
    audioProcessing: {
      quality: 'high',
      maxDuration: 1800,        // 30 minutes
      format: 'wav'            // Lossless format
    },
    maxScoreSize: 10000,
    maxAnnotationsPerScore: 'unlimited',
    optimizations: {
      progressiveLoading: false, // Load full scores
      asyncRendering: false,     // Synchronous rendering
      cacheAggressively: false   // Normal caching
    }
  }
}[DEPLOYMENT_TIER];
