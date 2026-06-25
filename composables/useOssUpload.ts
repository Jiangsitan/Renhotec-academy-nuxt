/**
 * OSS 直传 Composable
 * 统一处理小文件签名 PUT 直传和大文件 Multipart 分片直传
 */

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB

export const useOssUpload = () => {
  const api = useApi()

  /**
   * 上传文件到 OSS（自动选择小文件/大文件模式）
   */
  const upload = async (file: File, type: string, options?: {
    onProgress?: (percent: number) => void
    onSpeed?: (speed: number) => void
  }): Promise<{
    url: string
    path: string
    file_name: string
    file_size: number
    content_type: string | null
    converting: boolean
  }> => {
    const isLargeFile = file.size > CHUNK_SIZE

    if (isLargeFile) {
      return uploadLarge(file, type, options)
    } else {
      return uploadSmall(file, type, options)
    }
  }

  /**
   * 小文件直传（签名 PUT URL）
   */
  const uploadSmall = async (file: File, type: string, options?: {
    onProgress?: (percent: number) => void
    onSpeed?: (speed: number) => void
  }) => {
    // 1. 获取签名 URL
    const presignRes = await api.apiFetch<any>('/admin/upload/presign', {
      method: 'POST',
      body: { file_name: file.name, file_size: file.size, type },
    })

    const { upload_url, oss_path } = presignRes.data

    // 2. 直传到 OSS
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      let lastLoaded = 0
      let lastTime = Date.now()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          options?.onProgress?.(percent)

          const now = Date.now()
          const timeDiff = (now - lastTime) / 1000
          if (timeDiff > 0.5) {
            const speed = Math.round((e.loaded - lastLoaded) / timeDiff)
            options?.onSpeed?.(speed)
            lastLoaded = e.loaded
            lastTime = now
          }
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`OSS 上传失败: ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('网络错误')))
      xhr.addEventListener('abort', () => reject(new Error('上传已取消')))

      xhr.open('PUT', upload_url)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.send(file)
    })

    // 3. 通知后端上传完成
    const completeRes = await api.apiFetch<any>('/admin/upload/oss-complete', {
      method: 'POST',
      body: { oss_path, file_name: file.name, file_size: file.size, type },
    })

    return completeRes.data
  }

  /**
   * 大文件分片直传（OSS Multipart Upload）
   */
  const uploadLarge = async (file: File, type: string, options?: {
    onProgress?: (percent: number) => void
    onSpeed?: (speed: number) => void
  }) => {
    // 1. 初始化 Multipart Upload
    const initRes = await api.apiFetch<any>('/admin/upload/multipart/init', {
      method: 'POST',
      body: { file_name: file.name, file_size: file.size, type },
    })

    const { upload_id, oss_path } = initRes.data

    // 2. 分片
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const parts: { part_number: number; etag: string }[] = []
    let uploadedBytes = 0
    let lastTime = Date.now()

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)

      // 获取分片签名 URL
      const signRes = await api.apiFetch<any>('/admin/upload/multipart/sign', {
        method: 'POST',
        body: { upload_id, oss_path, part_number: i + 1 },
      })

      // 上传分片到 OSS
      const etag = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const totalUploaded = uploadedBytes + e.loaded
            const percent = Math.round((totalUploaded / file.size) * 100)
            options?.onProgress?.(percent)

            const now = Date.now()
            const timeDiff = (now - lastTime) / 1000
            if (timeDiff > 0.5) {
              const speed = Math.round(e.loaded / timeDiff)
              options?.onSpeed?.(speed)
              lastTime = now
            }
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = xhr.getResponseHeader('ETag') || ''
            resolve(etag)
          } else {
            reject(new Error(`分片上传失败: ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('网络错误')))

        xhr.open('PUT', signRes.data.signed_url)
        xhr.setRequestHeader('Content-Type', 'application/octet-stream')
        xhr.send(chunk)
      })

      parts.push({ part_number: i + 1, etag })
      uploadedBytes += chunk.size
    }

    // 3. 完成 Multipart Upload（OSS 云端合并）
    await api.apiFetch<any>('/admin/upload/multipart/complete', {
      method: 'POST',
      body: { upload_id, oss_path, parts },
    })

    // 4. 通知后端上传完成
    const completeRes = await api.apiFetch<any>('/admin/upload/oss-complete', {
      method: 'POST',
      body: { oss_path, file_name: file.name, file_size: file.size, type },
    })

    return completeRes.data
  }

  return { upload }
}
