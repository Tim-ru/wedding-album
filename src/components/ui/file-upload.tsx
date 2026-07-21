import { Upload } from 'lucide-react'
import { cn } from '../../lib/utils'

type FileUploadProps = {
  accept?: string
  className?: string
  description: string
  multiple?: boolean
  onFiles: (files: FileList | null) => void
  title: string
}

function FileUpload({
  accept,
  className,
  description,
  multiple,
  onFiles,
  title,
}: FileUploadProps) {
  return (
    <label
      className={cn('ui-file-upload', className)}
      data-slot="file-upload"
      onDrop={(event) => {
        event.preventDefault()
        onFiles(event.dataTransfer.files)
      }}
      onDragOver={(event) => event.preventDefault()}
    >
      <span className="ui-file-upload__icon">
        <Upload aria-hidden="true" />
      </span>
      <span className="ui-file-upload__title">{title}</span>
      <small>{description}</small>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => onFiles(event.target.files)}
      />
    </label>
  )
}

export { FileUpload }
