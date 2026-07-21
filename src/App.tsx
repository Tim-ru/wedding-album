import { useCallback, useEffect, useState } from 'react'
import {
  Download,
  ImagePlus,
  Images,
  Loader2,
  Lock,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import JSZip from 'jszip'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { supabase, supabaseConfigured } from './lib/supabase'
import './App.css'

const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'wedding-photos'
const ALBUM_ID = import.meta.env.VITE_ALBUM_ID || 'main'
const COUPLE_NAMES = import.meta.env.VITE_COUPLE_NAMES || 'Wedding Album'
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || ''
const ENABLE_DELETES = import.meta.env.VITE_ENABLE_DELETES === 'true'
const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_FILE_SIZE_MB || 15)
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024

type Photo = {
  id: string
  album_id: string
  storage_path: string
  public_url: string
  guest_name: string | null
  original_name: string
  size_bytes: number
  mime_type: string
  created_at: string
}

type UploadItem = {
  id: string
  file: File
  previewUrl: string
  status: 'queued' | 'uploading' | 'done' | 'error'
  error?: string
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AlbumPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </HashRouter>
  )
}

function AlbumPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [guestName, setGuestName] = useState(
    () => localStorage.getItem('wedding-album:name') || '',
  )
  const [items, setItems] = useState<UploadItem[]>([])
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null)
  const [message, setMessage] = useState('')

  const loadPhotos = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('album_id', ALBUM_ID)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
    } else {
      setPhotos(data || [])
      setMessage('')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadPhotos()
  }, [loadPhotos])

  useEffect(() => {
    localStorage.setItem('wedding-album:name', guestName)
  }, [guestName])

  const onPickFiles = (files: FileList | null) => {
    if (!files?.length) return

    const nextItems = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: file.size > MAX_FILE_SIZE ? 'error' : 'queued',
        error:
          file.size > MAX_FILE_SIZE
            ? `Файл больше ${MAX_FILE_SIZE_MB} МБ`
            : undefined,
      })) satisfies UploadItem[]

    setItems((current) => [...nextItems, ...current])
  }

  const uploadQueued = async () => {
    if (!supabaseConfigured) {
      setMessage('Добавь Supabase URL и publishable key в .env.local.')
      return
    }

    const queued = items.filter((item) => item.status === 'queued')
    for (const item of queued) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: 'uploading' } : entry,
        ),
      )

      const extension = getExtension(item.file.name)
      const storagePath = `${ALBUM_ID}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, item.file, {
          cacheControl: '31536000',
          contentType: item.file.type,
          upsert: false,
        })

      if (uploadError) {
        markUploadError(item.id, uploadError.message)
        continue
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath)

      const { data, error: insertError } = await supabase
        .from('photos')
        .insert({
          album_id: ALBUM_ID,
          storage_path: storagePath,
          public_url: publicUrlData.publicUrl,
          guest_name: guestName.trim() || null,
          original_name: item.file.name,
          size_bytes: item.file.size,
          mime_type: item.file.type,
        })
        .select('*')
        .single()

      if (insertError) {
        markUploadError(item.id, insertError.message)
        continue
      }

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: 'done' } : entry,
        ),
      )
      setPhotos((current) => [data, ...current])
    }
  }

  const markUploadError = (id: string, error: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: 'error', error } : item,
      ),
    )
  }

  const queuedCount = items.filter((item) => item.status === 'queued').length
  const uploading = items.some((item) => item.status === 'uploading')

  return (
    <main className="page-shell">
      <Header photoCount={photos.length} />

      <section className="hero-section" aria-labelledby="album-title">
        <div>
          <p className="eyebrow">Общий альбом</p>
          <h1 id="album-title">{COUPLE_NAMES}</h1>
          <p className="hero-copy">
            Загружайте фотографии со свадьбы и сразу смотрите моменты, которые
            поймали гости.
          </p>
        </div>
        <Link className="quiet-link" to="/admin">
          Админка
        </Link>
      </section>

      {!supabaseConfigured && <SetupNotice />}

      <section className="upload-panel" aria-labelledby="upload-title">
        <div className="panel-heading">
          <div>
            <h2 id="upload-title">Добавить фотографии</h2>
            <p>Можно выбрать сразу несколько снимков.</p>
          </div>
          <ImagePlus aria-hidden="true" />
        </div>

        <label className="field">
          <span>Имя гостя</span>
          <input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="Например, Аня"
            autoComplete="name"
          />
        </label>

        <label
          className="drop-zone"
          onDrop={(event) => {
            event.preventDefault()
            onPickFiles(event.dataTransfer.files)
          }}
          onDragOver={(event) => event.preventDefault()}
        >
          <Upload aria-hidden="true" />
          <span>Выбрать фото</span>
          <small>JPG, PNG, HEIC/WebP если поддерживает браузер, до {MAX_FILE_SIZE_MB} МБ</small>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => onPickFiles(event.target.files)}
          />
        </label>

        {items.length > 0 && (
          <div className="upload-list" aria-live="polite">
            {items.map((item) => (
              <div className="upload-row" key={item.id}>
                <img src={item.previewUrl} alt="" />
                <div>
                  <strong>{item.file.name}</strong>
                  <span>{formatBytes(item.file.size)}</span>
                  {item.error && <small className="error-text">{item.error}</small>}
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        )}

        <button
          className="primary-action"
          type="button"
          disabled={!queuedCount || uploading}
          onClick={uploadQueued}
        >
          {uploading ? <Loader2 className="spin" /> : <Upload />}
          {uploading
            ? 'Загружаем'
            : queuedCount
              ? `Загрузить ${queuedCount}`
              : 'Фото выбраны'}
        </button>

        {message && <p className="error-text">{message}</p>}
      </section>

      <section className="gallery-section" aria-labelledby="gallery-title">
        <div className="gallery-heading">
          <div>
            <h2 id="gallery-title">Галерея</h2>
            <p>{photos.length ? `${photos.length} фото` : 'Пока пусто'}</p>
          </div>
          <button className="icon-button" type="button" onClick={loadPhotos}>
            <RefreshCw aria-hidden="true" />
            <span className="sr-only">Обновить галерею</span>
          </button>
        </div>

        {loading ? (
          <EmptyState title="Загружаем альбом" copy="Сейчас подтянем фотографии." />
        ) : photos.length ? (
          <div className="photo-grid">
            {photos.map((photo) => (
              <button
                className="photo-tile"
                key={photo.id}
                type="button"
                onClick={() => setActivePhoto(photo)}
              >
                <img src={photo.public_url} alt={photo.guest_name || 'Фото со свадьбы'} />
                <span>{formatDate(photo.created_at)}</span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Первое фото еще впереди"
            copy="Когда гости начнут загружать снимки, они появятся здесь."
          />
        )}
      </section>

      {activePhoto && (
        <PhotoDialog photo={activePhoto} onClose={() => setActivePhoto(null)} />
      )}
    </main>
  )
}

function AdminPage() {
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(() => !ADMIN_PIN)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const loadPhotos = useCallback(async () => {
    if (!supabaseConfigured) {
      setError('Добавь Supabase URL и publishable key в .env.local.')
      return
    }
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('photos')
      .select('*')
      .eq('album_id', ALBUM_ID)
      .order('created_at', { ascending: false })

    if (loadError) {
      setError(loadError.message)
    } else {
      setPhotos(data || [])
      setError('')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (unlocked) void loadPhotos()
  }, [loadPhotos, unlocked])

  const unlock = () => {
    if (!ADMIN_PIN || pin === ADMIN_PIN) {
      setUnlocked(true)
      setError('')
    } else {
      setError('PIN не подошел.')
    }
  }

  const downloadZip = async () => {
    setBusy('zip')
    setError('')
    const zip = new JSZip()

    try {
      for (const [index, photo] of photos.entries()) {
        const response = await fetch(photo.public_url)
        if (!response.ok) throw new Error(`Не удалось скачать ${photo.original_name}`)
        const blob = await response.blob()
        const extension = getExtension(photo.original_name)
        const safeName = `${String(index + 1).padStart(3, '0')}-${slugify(
          photo.guest_name || 'guest',
        )}-${photo.id}.${extension}`
        zip.file(safeName, blob)
      }

      const archive = await zip.generateAsync({ type: 'blob' })
      downloadBlob(archive, `${slugify(COUPLE_NAMES)}-wedding-photos.zip`)
    } catch (zipError) {
      setError(zipError instanceof Error ? zipError.message : 'Не удалось собрать ZIP.')
    } finally {
      setBusy('')
    }
  }

  const deletePhoto = async (photo: Photo) => {
    if (!ENABLE_DELETES) {
      setError('Удаление выключено. Включи VITE_ENABLE_DELETES и Supabase delete-policy.')
      return
    }

    setBusy(photo.id)
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([photo.storage_path])
    const { error: rowError } = await supabase.from('photos').delete().eq('id', photo.id)

    if (storageError || rowError) {
      setError(storageError?.message || rowError?.message || 'Не удалось удалить фото.')
    } else {
      setPhotos((current) => current.filter((item) => item.id !== photo.id))
    }
    setBusy('')
  }

  if (!unlocked) {
    return (
      <main className="page-shell admin-shell">
        <Link className="quiet-link" to="/">
          Назад в альбом
        </Link>
        <section className="login-panel">
          <Lock aria-hidden="true" />
          <h1>Админка</h1>
          <p>Введите PIN, чтобы выгрузить фотографии.</p>
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') unlock()
            }}
            placeholder="PIN"
            type="password"
          />
          <button className="primary-action" type="button" onClick={unlock}>
            Открыть
          </button>
          {error && <p className="error-text">{error}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell admin-shell">
      <div className="admin-topbar">
        <Link className="quiet-link" to="/">
          Назад в альбом
        </Link>
        <button className="icon-button" type="button" onClick={loadPhotos}>
          <RefreshCw aria-hidden="true" />
          <span className="sr-only">Обновить список</span>
        </button>
      </div>

      <section className="hero-section compact">
        <div>
          <p className="eyebrow">Админка</p>
          <h1>Выгрузка альбома</h1>
          <p className="hero-copy">Скачайте все фотографии одним ZIP-архивом.</p>
        </div>
        <button
          className="primary-action fit"
          type="button"
          disabled={!photos.length || busy === 'zip'}
          onClick={downloadZip}
        >
          {busy === 'zip' ? <Loader2 className="spin" /> : <Download />}
          Скачать ZIP
        </button>
      </section>

      {error && <p className="error-banner">{error}</p>}

      <section className="admin-list" aria-label="Фотографии">
        {loading ? (
          <EmptyState title="Загружаем список" copy="Почти готово." />
        ) : photos.length ? (
          photos.map((photo) => (
            <article className="admin-photo" key={photo.id}>
              <img src={photo.public_url} alt="" />
              <div>
                <strong>{photo.original_name}</strong>
                <span>{photo.guest_name || 'Гость без имени'}</span>
                <small>
                  {formatDate(photo.created_at)} · {formatBytes(photo.size_bytes)}
                </small>
              </div>
              <a className="icon-button" href={photo.public_url} download>
                <Download aria-hidden="true" />
                <span className="sr-only">Скачать фото</span>
              </a>
              <button
                className="icon-button danger"
                type="button"
                disabled={busy === photo.id}
                onClick={() => void deletePhoto(photo)}
              >
                {busy === photo.id ? <Loader2 className="spin" /> : <Trash2 />}
                <span className="sr-only">Удалить фото</span>
              </button>
            </article>
          ))
        ) : (
          <EmptyState title="Фото пока нет" copy="Здесь появятся загруженные снимки." />
        )}
      </section>
    </main>
  )
}

function Header({ photoCount }: { photoCount: number }) {
  return (
    <header className="topbar">
      <Link className="brand" to="/">
        <Images aria-hidden="true" />
        <span>{COUPLE_NAMES}</span>
      </Link>
      <span>{photoCount} фото</span>
    </header>
  )
}

function SetupNotice() {
  return (
    <section className="setup-notice">
      <strong>Нужна настройка Supabase</strong>
      <span>
        Интерфейс готов, но загрузка включится после заполнения переменных
        VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY.
      </span>
    </section>
  )
}

function StatusBadge({ status }: { status: UploadItem['status'] }) {
  const labels = {
    queued: 'готово',
    uploading: 'загрузка',
    done: 'готово',
    error: 'ошибка',
  }

  return (
    <span className={`status-badge ${status}`}>
      {status === 'uploading' && <Loader2 className="spin" />}
      {labels[status]}
    </span>
  )
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty-state">
      <Images aria-hidden="true" />
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  )
}

function PhotoDialog({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <div className="photo-dialog">
        <button className="icon-button close-button" type="button" onClick={onClose}>
          <X aria-hidden="true" />
          <span className="sr-only">Закрыть</span>
        </button>
        <img src={photo.public_url} alt={photo.guest_name || 'Фото со свадьбы'} />
        <div>
          <strong>{photo.guest_name || 'Гость без имени'}</strong>
          <span>{formatDate(photo.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

function getExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 Б'
  const units = ['Б', 'КБ', 'МБ', 'ГБ']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export default App
