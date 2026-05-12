// Image / video template detail surface for the home plugin gallery.
//
// Visually inspired by curated content viewers (Pinterest, Are.na,
// Lenny's Newsletter): a generous cinematic hero showing the asset
// in its full aspect ratio, the byline + tags strip floating just
// underneath, and the prompt body block with copy + lightbox
// affordances below. The whole modal is share-first — the header
// carries `Share` (PluginShareMenu) right next to Close so users
// can copy / link the plugin without scrolling, and the footer
// pins the primary "Use plugin" CTA so the path back to the
// prompt is always one click away.

import { useEffect, useMemo, useState } from 'react';
import type {
  InputField,
  InstalledPluginRecord,
  PluginManifest,
} from '@open-design/contracts';
import { useT } from '../../i18n';
import { Icon } from '../Icon';
import { PluginByline } from './PluginByline';
import { PluginShareMenu } from './PluginShareMenu';

interface Props {
  record: InstalledPluginRecord;
  onClose: () => void;
  onUse: (record: InstalledPluginRecord) => void;
  isApplying?: boolean;
}

interface MediaPreview {
  poster: string | null;
  videoUrl: string | null;
  isVideo: boolean;
}

function readMedia(record: InstalledPluginRecord): MediaPreview {
  const preview = record.manifest?.od?.preview as
    | { type?: unknown; poster?: unknown; video?: unknown; gif?: unknown }
    | undefined;
  if (!preview) return { poster: null, videoUrl: null, isVideo: false };
  const poster = typeof preview.poster === 'string' ? preview.poster : null;
  const video = typeof preview.video === 'string' ? preview.video : null;
  const gif = typeof preview.gif === 'string' ? preview.gif : null;
  const t = typeof preview.type === 'string' ? preview.type.toLowerCase() : '';
  const isVideo = t === 'video' || Boolean(video);
  return {
    poster: poster ?? gif,
    videoUrl: video,
    isVideo,
  };
}

function findInputDefault(
  inputs: InputField[],
  name: string,
): string | null {
  const field = inputs.find((f) => f.name === name);
  if (!field) return null;
  if (field.default !== undefined && field.default !== null) {
    return String(field.default);
  }
  if (field.options && field.options.length > 0) return String(field.options[0]);
  return null;
}

const NOISE_TAGS = new Set<string>([
  'first-party',
  'third-party',
  'phase-1',
  'phase-7',
  'untitled',
  'plugin',
  'image-template',
  'video-template',
]);

export function PluginMediaDetail({
  record,
  onClose,
  onUse,
  isApplying,
}: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const manifest: PluginManifest = record.manifest ?? ({} as PluginManifest);
  const od = manifest.od ?? {};
  const description = manifest.description ?? '';
  const query = od.useCase?.query ?? '';
  const inputs = (od.inputs ?? []) as InputField[];
  const tags = useMemo(
    () =>
      (manifest.tags ?? []).filter(
        (tag) => !NOISE_TAGS.has(tag.toLowerCase()),
      ),
    [manifest.tags],
  );
  const media = useMemo(() => readMedia(record), [record]);
  const hasAsset = Boolean(media.poster || media.videoUrl);

  const model = findInputDefault(inputs, 'model');
  const aspect = findInputDefault(inputs, 'aspect');
  const surfaceLabel = media.isVideo ? 'video' : 'image';

  // Reset transient state when the active record swaps so the next
  // open never inherits the previous plugin's copied / lightbox flags.
  useEffect(() => {
    setCopied(false);
    setLightboxOpen(false);
  }, [record.id]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc closes the lightbox first (preserve the modal underneath),
  // then the modal itself — mirrors PromptTemplatePreviewModal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (lightboxOpen) {
        setLightboxOpen(false);
        return;
      }
      onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, lightboxOpen]);

  function handleCopy() {
    if (!query) return;
    void navigator.clipboard.writeText(query).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  const fullscreenLabel = t('promptTemplates.openFullscreen');
  const closeFullscreenLabel = t('promptTemplates.closeFullscreen');

  return (
    <>
      <div
        className="plugin-media-detail-backdrop"
        role="dialog"
        aria-modal="true"
        data-testid="plugin-details-modal"
        data-plugin-id={record.id}
        data-detail-variant="media"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="plugin-media-detail">
          <header className="plugin-media-detail__head">
            <div className="plugin-media-detail__head-titles">
              <div className="plugin-media-detail__eyebrow">
                <span className={`plugin-media-detail__surface is-${surfaceLabel}`}>
                  {surfaceLabel}
                </span>
                {model ? (
                  <span className="plugin-media-detail__chip">
                    {t('promptTemplates.modelHint', { model })}
                  </span>
                ) : null}
                {aspect ? (
                  <span className="plugin-media-detail__chip">{aspect}</span>
                ) : null}
              </div>
              <h2 className="plugin-media-detail__title">{record.title}</h2>
              {description ? (
                <p className="plugin-media-detail__description">{description}</p>
              ) : null}
            </div>
            <div className="plugin-media-detail__head-actions">
              <PluginShareMenu record={record} variant="default" />
              <button
                type="button"
                className="plugin-media-detail__close"
                onClick={onClose}
                aria-label={t('common.close')}
                title={t('preview.closeTitle')}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          </header>

          <PluginByline record={record} />

          {tags.length > 0 ? (
            <div className="plugin-media-detail__tags">
              {tags.map((tag) => (
                <span key={tag} className="plugin-media-detail__tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="plugin-media-detail__body">
            {hasAsset ? (
              <div className="plugin-media-detail__asset">
                {media.isVideo && media.videoUrl ? (
                  <video
                    src={media.videoUrl}
                    poster={media.poster ?? undefined}
                    controls
                    preload="none"
                    playsInline
                  />
                ) : media.poster ? (
                  <button
                    type="button"
                    className="plugin-media-detail__asset-trigger"
                    onClick={() => setLightboxOpen(true)}
                    aria-label={fullscreenLabel}
                  >
                    <img
                      src={media.poster}
                      alt={record.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="plugin-media-detail__asset-expand"
                  onClick={() => setLightboxOpen(true)}
                  aria-label={fullscreenLabel}
                  title={fullscreenLabel}
                >
                  <Icon name="eye" size={12} />
                  <span>{fullscreenLabel}</span>
                </button>
              </div>
            ) : null}

            {query ? (
              <div className="plugin-media-detail__prompt">
                <div className="plugin-media-detail__prompt-head">
                  <span className="plugin-media-detail__prompt-label">
                    {t('promptTemplates.promptLabel')}
                  </span>
                  <button
                    type="button"
                    className="plugin-media-detail__prompt-copy"
                    onClick={handleCopy}
                  >
                    <Icon name={copied ? 'check' : 'copy'} size={12} />
                    {copied
                      ? t('promptTemplates.copyDone')
                      : t('promptTemplates.copyPrompt')}
                  </button>
                </div>
                <pre className="plugin-media-detail__prompt-body">{query}</pre>
              </div>
            ) : null}
          </div>

          <footer className="plugin-media-detail__foot">
            <span className="plugin-media-detail__foot-meta">
              {record.sourceKind === 'bundled'
                ? 'Bundled with Open Design'
                : record.sourceKind}
              {manifest.license ? (
                <>
                  {' · '}
                  <span className="plugin-media-detail__license">
                    {manifest.license}
                  </span>
                </>
              ) : null}
            </span>
            <button
              type="button"
              className="plugin-media-detail__primary"
              onClick={() => onUse(record)}
              disabled={isApplying}
              aria-busy={isApplying ? 'true' : undefined}
              data-testid={`plugin-details-use-${record.id}`}
            >
              {isApplying ? 'Applying…' : 'Use plugin'}
            </button>
          </footer>
        </div>
      </div>

      {lightboxOpen && hasAsset ? (
        <div
          className="prompt-template-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={fullscreenLabel}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          {media.isVideo && media.videoUrl ? (
            <video
              className="prompt-template-lightbox-media"
              src={media.videoUrl}
              poster={media.poster ?? undefined}
              controls
              autoPlay
              playsInline
            />
          ) : media.poster ? (
            <img
              className="prompt-template-lightbox-media"
              src={media.poster}
              alt={record.title}
              referrerPolicy="no-referrer"
            />
          ) : null}
          <button
            type="button"
            className="prompt-template-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label={closeFullscreenLabel}
            title={closeFullscreenLabel}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ) : null}
    </>
  );
}
