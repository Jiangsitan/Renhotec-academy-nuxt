const CACHE_NAME = 'pdf-cache-v1'
const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 天

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // 只缓存 PDF 请求
  if (url.pathname.includes('/files/preview/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // 检查缓存是否过期
          const dateHeader = cachedResponse.headers.get('sw-cached-at')
          if (dateHeader && Date.now() - parseInt(dateHeader) < MAX_AGE) {
            return cachedResponse
          }
        }
        
        // 从网络获取
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            const headers = new Headers(responseClone.headers)
            headers.append('sw-cached-at', Date.now().toString())
            
            responseClone.blob().then((body) => {
              const cachedResponse = new Response(body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: headers
              })
              
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, cachedResponse)
              })
            })
          }
          return response
        })
      })
    )
  }
})
