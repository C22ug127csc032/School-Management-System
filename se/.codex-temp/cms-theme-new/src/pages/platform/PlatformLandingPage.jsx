import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PageHeader } from '../../components/common';
import { LANDING_ICON_OPTIONS } from '../../components/landing/iconMap';
import {
  cloneLandingPagePayload,
  LANDING_SECTION_LABELS,
  moveSection,
  normalizeLandingPagePayload,
  updateValueAtPath,
} from '../../utils/landingPage';
import {
  FiArrowDown,
  FiArrowUp,
  FiCamera,
  FiCheck,
  FiHome,
  FiPlus,
  FiTrash2,
} from '../../components/common/icons';

const readValueAtPath = (source, path) =>
  String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, segment) => (current && typeof current === 'object' ? current[segment] : undefined), source);

const toArray = value => (Array.isArray(value) ? value : []);
const cloneEditorValue = value => JSON.parse(JSON.stringify(value));

const createPricingPlanTemplate = () => ({
  key: 'custom',
  name: 'Custom Plan',
  badge: '',
  tagline: '',
  priceLabel: '',
  periodLabel: 'Per month',
  ctaLabel: 'Start Free Trial',
  ctaHref: '/trial',
  isHighlighted: false,
  footnote: '',
  limits: ['Students: 0'],
  features: ['New feature'],
});

const SECTION_TEMPLATES = {
  'stats.items': { value: 10, prefix: '', suffix: '+', label: 'New Stat', description: '' },
  'overview.cards': { title: 'New Overview Card', description: '' },
  'modules.items': { title: 'New Module', description: '', badge: '', iconKey: 'FiUsers' },
  'features.items': { title: 'New Feature', description: '', iconKey: 'FiShield' },
  'preview.metricCards': { label: 'New Metric', value: '0' },
  'preview.activityItems': { title: 'New Activity', meta: '' },
  'pricing.plans': createPricingPlanTemplate,
  'testimonials.items': { quote: '', name: '', role: '', institution: '', avatarUrl: '', avatarPublicId: '', rating: 5 },
  'faq.items': { question: '', answer: '' },
  'contact.cards': { title: 'New Contact Card', description: '', ctaLabel: 'Contact Us', ctaHref: '#contact' },
  'footer.links': { label: 'New Link', href: '/trial' },
};

const SectionPanel = ({ title, subtitle, children }) => (
  <section className="border border-border bg-white p-5 shadow-sm">
    <div className="border-b border-border pb-4">
      <p className="text-base font-semibold text-text-primary">{title}</p>
      {subtitle ? <p className="mt-1 text-xs text-text-secondary">{subtitle}</p> : null}
    </div>
    <div className="mt-5 space-y-5">{children}</div>
  </section>
);

const Field = ({ label, helper, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {helper ? <p className="mt-2 text-xs text-text-secondary">{helper}</p> : null}
  </div>
);

const TextInput = ({ label, value, onChange, helper = '', ...props }) => (
  <Field label={label} helper={helper}>
    <input className="input" value={value || ''} onChange={event => onChange(event.target.value)} {...props} />
  </Field>
);

const TextAreaInput = ({ label, value, onChange, helper = '', rows = 4, ...props }) => (
  <Field label={label} helper={helper}>
    <textarea className="input min-h-[120px]" rows={rows} value={value || ''} onChange={event => onChange(event.target.value)} {...props} />
  </Field>
);

const ToggleField = ({ label, checked, onChange, helper = '' }) => (
  <div className="border border-border bg-slate-50 px-4 py-4">
    <label className="flex items-start gap-3">
      <input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)} className="mt-1" />
      <span>
        <span className="block text-sm font-semibold text-text-primary">{label}</span>
        {helper ? <span className="mt-1 block text-xs text-text-secondary">{helper}</span> : null}
      </span>
    </label>
  </div>
);

const ArrayItemActions = ({ onMoveUp, onMoveDown, onRemove, disableUp, disableDown }) => (
  <div className="flex flex-wrap gap-2">
    <button type="button" onClick={onMoveUp} disabled={disableUp} className="btn-secondary px-3 py-2 text-xs disabled:opacity-40">
      <FiArrowUp />
      Up
    </button>
    <button type="button" onClick={onMoveDown} disabled={disableDown} className="btn-secondary px-3 py-2 text-xs disabled:opacity-40">
      <FiArrowDown />
      Down
    </button>
    <button type="button" onClick={onRemove} className="btn-danger px-3 py-2 text-xs">
      <FiTrash2 />
      Remove
    </button>
  </div>
);

const ArrayStringEditor = ({
  label,
  values,
  onChange,
  onAdd,
  addLabel = 'Add Item',
}) => (
  <div>
    <div className="mb-3 flex items-center justify-between gap-3">
      <label className="label mb-0">{label}</label>
      <button type="button" onClick={onAdd} className="btn-secondary px-3 py-2 text-xs">
        <FiPlus />
        {addLabel}
      </button>
    </div>
    <div className="space-y-3">
      {values.map((value, index) => (
        <input
          key={`${label}-${index}`}
          className="input"
          value={value || ''}
          onChange={event => onChange(index, event.target.value)}
          placeholder={`Item ${index + 1}`}
        />
      ))}
      {!values.length ? <p className="text-xs text-text-secondary">No items added yet.</p> : null}
    </div>
  </div>
);

const ImageUploadField = ({
  label,
  helper,
  fieldPath,
  currentUrl,
  uploadingField,
  onUpload,
}) => (
  <div className="border border-border bg-slate-50 p-4">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        {helper ? <p className="mt-1 text-xs text-text-secondary">{helper}</p> : null}
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={label}
            className="mt-3 h-24 w-full max-w-[220px] border border-border object-cover"
          />
        ) : (
          <p className="mt-3 text-xs text-text-secondary">No image uploaded yet.</p>
        )}
      </div>
      <label className="btn-secondary cursor-pointer px-4 py-3 text-xs">
        {uploadingField === fieldPath ? <FiCheck /> : <FiCamera />}
        {uploadingField === fieldPath ? 'Uploading...' : 'Upload Image'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) {
              onUpload(fieldPath, file);
            }
            event.target.value = '';
          }}
        />
      </label>
    </div>
  </div>
);

export default function PlatformLandingPage() {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState('');

  const loadLandingPage = async () => {
    setLoading(true);
    try {
      const response = await api.get('/platform/landing-page', {
        params: { _ts: Date.now() },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      setDraft(normalizeLandingPagePayload(response.data));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load landing page configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLandingPage();
  }, []);

  const handleValueChange = (path, value) => {
    setDraft(current => updateValueAtPath(current, path, value));
  };

  const handleSectionVisibility = (sectionKey, checked) => {
    setDraft(current => updateValueAtPath(current, `sectionVisibility.${sectionKey}`, checked));
  };

  const handleSectionOrderMove = (sectionKey, direction) => {
    setDraft(current => updateValueAtPath(current, 'sectionOrder', moveSection(current?.sectionOrder, sectionKey, direction)));
  };

  const handleArrayAdd = (path, template) => {
    setDraft(current => {
      const nextValue = typeof template === 'function' ? template() : template;
      const currentItems = toArray(readValueAtPath(current, path));
      return updateValueAtPath(current, path, [...currentItems, cloneEditorValue(nextValue)]);
    });
  };

  const handleArrayRemove = (path, index) => {
    setDraft(current => {
      const currentItems = toArray(readValueAtPath(current, path));
      return updateValueAtPath(current, path, currentItems.filter((_, itemIndex) => itemIndex !== index));
    });
  };

  const handleArrayMove = (path, index, direction) => {
    setDraft(current => {
      const currentItems = [...toArray(readValueAtPath(current, path))];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= currentItems.length) {
        return current;
      }
      [currentItems[index], currentItems[targetIndex]] = [currentItems[targetIndex], currentItems[index]];
      return updateValueAtPath(current, path, currentItems);
    });
  };

  const handleAssetUpload = async (fieldPath, file) => {
    if (!file) return;

    setUploadingField(fieldPath);
    try {
      const formData = new FormData();
      formData.append('fieldPath', fieldPath);
      formData.append('asset', file);

      const response = await api.post('/platform/landing-page/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDraft(normalizeLandingPagePayload(response.data));
      toast.success('Landing page image updated.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to upload landing page image');
    } finally {
      setUploadingField('');
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await api.put('/platform/landing-page', cloneLandingPagePayload(draft));
      setDraft(normalizeLandingPagePayload(response.data));
      toast.success('Landing page content saved.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save landing page');
    } finally {
      setSaving(false);
    }
  };

  const sectionOrder = useMemo(() => draft?.sectionOrder || [], [draft?.sectionOrder]);

  if (loading) {
    return <div className="border border-border bg-white p-6 text-sm text-text-secondary">Loading landing page control...</div>;
  }

  if (!draft) {
    return <div className="border border-border bg-white p-6 text-sm text-red-700">Landing page configuration could not be loaded.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Landing Page"
        subtitle="Control the public Ematix SaaS landing experience from one backend-driven workspace without editing code."
        action={(
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="/" target="_blank" rel="noreferrer" className="btn-secondary px-5 py-3">
              <FiHome />
              View Public Page
            </a>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary px-5 py-3 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Landing Page'}
            </button>
          </div>
        )}
      />

      <SectionPanel
        title="Section Visibility And Order"
        subtitle="Enable, disable, and reorder the public sections. The landing page renders using this order from the backend response."
      >
        <div className="grid gap-3">
          {sectionOrder.map((sectionKey, index) => (
            <div key={sectionKey} className="flex flex-col gap-3 border border-border bg-slate-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={draft.sectionVisibility?.[sectionKey] !== false}
                  onChange={event => handleSectionVisibility(sectionKey, event.target.checked)}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-text-primary">{LANDING_SECTION_LABELS[sectionKey] || sectionKey}</p>
                  <p className="text-xs text-text-secondary">Section key: {sectionKey}</p>
                </div>
              </div>
              <ArrayItemActions
                onMoveUp={() => handleSectionOrderMove(sectionKey, 'up')}
                onMoveDown={() => handleSectionOrderMove(sectionKey, 'down')}
                onRemove={() => handleSectionVisibility(sectionKey, false)}
                disableUp={index === 0}
                disableDown={index === sectionOrder.length - 1}
              />
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel title="Hero Section" subtitle="Top-fold conversion area with CTAs, trust points, and the main preview panel.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Eyebrow" value={draft.hero?.eyebrow} onChange={value => handleValueChange('hero.eyebrow', value)} />
          <TextInput label="Badge" value={draft.hero?.badge} onChange={value => handleValueChange('hero.badge', value)} />
          <TextAreaInput label="Title" value={draft.hero?.title} onChange={value => handleValueChange('hero.title', value)} rows={3} />
          <TextAreaInput label="Description" value={draft.hero?.description} onChange={value => handleValueChange('hero.description', value)} rows={3} />
          <TextInput label="Primary CTA Label" value={draft.hero?.primaryCtaLabel} onChange={value => handleValueChange('hero.primaryCtaLabel', value)} />
          <TextInput label="Primary CTA Link" value={draft.hero?.primaryCtaHref} onChange={value => handleValueChange('hero.primaryCtaHref', value)} />
          <TextInput label="Secondary CTA Label" value={draft.hero?.secondaryCtaLabel} onChange={value => handleValueChange('hero.secondaryCtaLabel', value)} />
          <TextInput label="Secondary CTA Link" value={draft.hero?.secondaryCtaHref} onChange={value => handleValueChange('hero.secondaryCtaHref', value)} />
        </div>
        <TextAreaInput label="Announcement" value={draft.hero?.announcement} onChange={value => handleValueChange('hero.announcement', value)} rows={3} />
        <ArrayStringEditor
          label="Trust Points"
          values={toArray(draft.hero?.trustPoints)}
          onAdd={() => handleArrayAdd('hero.trustPoints', 'New trust point')}
          onChange={(index, value) => handleValueChange(`hero.trustPoints.${index}`, value)}
          addLabel="Add Trust Point"
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Media Headline" value={draft.hero?.media?.headline} onChange={value => handleValueChange('hero.media.headline', value)} />
          <TextAreaInput label="Media Subheadline" value={draft.hero?.media?.subheadline} onChange={value => handleValueChange('hero.media.subheadline', value)} rows={3} />
        </div>
        <ImageUploadField
          label="Hero Media Image"
          helper="Optional visual for the right-side hero preview. Image uploads save immediately."
          fieldPath="hero.media.imageUrl"
          currentUrl={draft.hero?.media?.imageUrl}
          uploadingField={uploadingField}
          onUpload={handleAssetUpload}
        />
      </SectionPanel>

      <SectionPanel title="Stats Section" subtitle="Animated trust metrics shown after the hero.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Eyebrow" value={draft.stats?.eyebrow} onChange={value => handleValueChange('stats.eyebrow', value)} />
          <TextInput label="Title" value={draft.stats?.title} onChange={value => handleValueChange('stats.title', value)} />
        </div>
        <TextAreaInput label="Description" value={draft.stats?.description} onChange={value => handleValueChange('stats.description', value)} rows={3} />
        <div className="space-y-4">
          {toArray(draft.stats?.items).map((item, index) => (
            <div key={`stat-${index}`} className="border border-border bg-slate-50 p-4">
              <div className="grid gap-4 xl:grid-cols-4">
                <TextInput label="Value" type="number" value={item?.value} onChange={value => handleValueChange(`stats.items.${index}.value`, Number(value || 0))} />
                <TextInput label="Prefix" value={item?.prefix} onChange={value => handleValueChange(`stats.items.${index}.prefix`, value)} />
                <TextInput label="Suffix" value={item?.suffix} onChange={value => handleValueChange(`stats.items.${index}.suffix`, value)} />
                <TextInput label="Label" value={item?.label} onChange={value => handleValueChange(`stats.items.${index}.label`, value)} />
              </div>
              <TextAreaInput label="Description" value={item?.description} onChange={value => handleValueChange(`stats.items.${index}.description`, value)} rows={3} />
              <ArrayItemActions
                onMoveUp={() => handleArrayMove('stats.items', index, 'up')}
                onMoveDown={() => handleArrayMove('stats.items', index, 'down')}
                onRemove={() => handleArrayRemove('stats.items', index)}
                disableUp={index === 0}
                disableDown={index === toArray(draft.stats?.items).length - 1}
              />
            </div>
          ))}
          <button type="button" onClick={() => handleArrayAdd('stats.items', SECTION_TEMPLATES['stats.items'])} className="btn-secondary px-4 py-3">
            <FiPlus />
            Add Stat Card
          </button>
        </div>
      </SectionPanel>

      <SectionPanel title="Product Overview" subtitle="Three-column story that explains the platform at a glance.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Eyebrow" value={draft.overview?.eyebrow} onChange={value => handleValueChange('overview.eyebrow', value)} />
          <TextInput label="Title" value={draft.overview?.title} onChange={value => handleValueChange('overview.title', value)} />
        </div>
        <TextAreaInput label="Description" value={draft.overview?.description} onChange={value => handleValueChange('overview.description', value)} rows={3} />
        <div className="space-y-4">
          {toArray(draft.overview?.cards).map((item, index) => (
            <div key={`overview-${index}`} className="border border-border bg-slate-50 p-4">
              <TextInput label="Card Title" value={item?.title} onChange={value => handleValueChange(`overview.cards.${index}.title`, value)} />
              <TextAreaInput label="Card Description" value={item?.description} onChange={value => handleValueChange(`overview.cards.${index}.description`, value)} rows={3} />
              <ArrayItemActions
                onMoveUp={() => handleArrayMove('overview.cards', index, 'up')}
                onMoveDown={() => handleArrayMove('overview.cards', index, 'down')}
                onRemove={() => handleArrayRemove('overview.cards', index)}
                disableUp={index === 0}
                disableDown={index === toArray(draft.overview?.cards).length - 1}
              />
            </div>
          ))}
          <button type="button" onClick={() => handleArrayAdd('overview.cards', SECTION_TEMPLATES['overview.cards'])} className="btn-secondary px-4 py-3">
            <FiPlus />
            Add Overview Card
          </button>
        </div>
      </SectionPanel>

      <SectionPanel title="Modules Showcase" subtitle="Feature tiles for the public modules grid.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Eyebrow" value={draft.modules?.eyebrow} onChange={value => handleValueChange('modules.eyebrow', value)} />
          <TextInput label="Title" value={draft.modules?.title} onChange={value => handleValueChange('modules.title', value)} />
        </div>
        <TextAreaInput label="Description" value={draft.modules?.description} onChange={value => handleValueChange('modules.description', value)} rows={3} />
        <div className="space-y-4">
          {toArray(draft.modules?.items).map((item, index) => (
            <div key={`module-${index}`} className="border border-border bg-slate-50 p-4">
              <div className="grid gap-4 xl:grid-cols-3">
                <TextInput label="Title" value={item?.title} onChange={value => handleValueChange(`modules.items.${index}.title`, value)} />
                <TextInput label="Badge" value={item?.badge} onChange={value => handleValueChange(`modules.items.${index}.badge`, value)} />
                <Field label="Icon">
                  <select className="input" value={item?.iconKey || 'FiUsers'} onChange={event => handleValueChange(`modules.items.${index}.iconKey`, event.target.value)}>
                    {LANDING_ICON_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <TextAreaInput label="Description" value={item?.description} onChange={value => handleValueChange(`modules.items.${index}.description`, value)} rows={3} />
              <ArrayItemActions
                onMoveUp={() => handleArrayMove('modules.items', index, 'up')}
                onMoveDown={() => handleArrayMove('modules.items', index, 'down')}
                onRemove={() => handleArrayRemove('modules.items', index)}
                disableUp={index === 0}
                disableDown={index === toArray(draft.modules?.items).length - 1}
              />
            </div>
          ))}
          <button type="button" onClick={() => handleArrayAdd('modules.items', SECTION_TEMPLATES['modules.items'])} className="btn-secondary px-4 py-3">
            <FiPlus />
            Add Module
          </button>
        </div>
      </SectionPanel>

      <SectionPanel title="Features Section" subtitle="The SaaS-level differentiators shown in the features grid.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Eyebrow" value={draft.features?.eyebrow} onChange={value => handleValueChange('features.eyebrow', value)} />
          <TextInput label="Title" value={draft.features?.title} onChange={value => handleValueChange('features.title', value)} />
        </div>
        <TextAreaInput label="Description" value={draft.features?.description} onChange={value => handleValueChange('features.description', value)} rows={3} />
        <div className="space-y-4">
          {toArray(draft.features?.items).map((item, index) => (
            <div key={`feature-${index}`} className="border border-border bg-slate-50 p-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <TextInput label="Title" value={item?.title} onChange={value => handleValueChange(`features.items.${index}.title`, value)} />
                <Field label="Icon">
                  <select className="input" value={item?.iconKey || 'FiShield'} onChange={event => handleValueChange(`features.items.${index}.iconKey`, event.target.value)}>
                    {LANDING_ICON_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <TextAreaInput label="Description" value={item?.description} onChange={value => handleValueChange(`features.items.${index}.description`, value)} rows={3} />
              <ArrayItemActions
                onMoveUp={() => handleArrayMove('features.items', index, 'up')}
                onMoveDown={() => handleArrayMove('features.items', index, 'down')}
                onRemove={() => handleArrayRemove('features.items', index)}
                disableUp={index === 0}
                disableDown={index === toArray(draft.features?.items).length - 1}
              />
            </div>
          ))}
          <button type="button" onClick={() => handleArrayAdd('features.items', SECTION_TEMPLATES['features.items'])} className="btn-secondary px-4 py-3">
            <FiPlus />
            Add Feature
          </button>
        </div>
      </SectionPanel>

      <SectionPanel title="Product Preview" subtitle="Interactive dashboard showcase and product storytelling panel.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Eyebrow" value={draft.preview?.eyebrow} onChange={value => handleValueChange('preview.eyebrow', value)} />
          <TextInput label="Title" value={draft.preview?.title} onChange={value => handleValueChange('preview.title', value)} />
        </div>
        <TextAreaInput label="Description" value={draft.preview?.description} onChange={value => handleValueChange('preview.description', value)} rows={3} />
        <ImageUploadField
          label="Preview Image"
          helper="Optional dashboard screenshot or preview artwork."
          fieldPath="preview.imageUrl"
          currentUrl={draft.preview?.imageUrl}
          uploadingField={uploadingField}
          onUpload={handleAssetUpload}
        />
        <ArrayStringEditor
          label="Sidebar Items"
          values={toArray(draft.preview?.sidebarItems)}
          onAdd={() => handleArrayAdd('preview.sidebarItems', 'New Navigation Item')}
          onChange={(index, value) => handleValueChange(`preview.sidebarItems.${index}`, value)}
          addLabel="Add Sidebar Item"
        />
        <div className="space-y-4">
          {toArray(draft.preview?.metricCards).map((item, index) => (
            <div key={`metric-${index}`} className="border border-border bg-slate-50 p-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <TextInput label="Metric Label" value={item?.label} onChange={value => handleValueChange(`preview.metricCards.${index}.label`, value)} />
                <TextInput label="Metric Value" value={item?.value} onChange={value => handleValueChange(`preview.metricCards.${index}.value`, value)} />
              </div>
              <ArrayItemActions
                onMoveUp={() => handleArrayMove('preview.metricCards', index, 'up')}
                onMoveDown={() => handleArrayMove('preview.metricCards', index, 'down')}
                onRemove={() => handleArrayRemove('preview.metricCards', index)}
                disableUp={index === 0}
                disableDown={index === toArray(draft.preview?.metricCards).length - 1}
              />
            </div>
          ))}
          <button type="button" onClick={() => handleArrayAdd('preview.metricCards', SECTION_TEMPLATES['preview.metricCards'])} className="btn-secondary px-4 py-3">
            <FiPlus />
            Add Metric Card
          </button>
        </div>
        <div className="space-y-4">
          {toArray(draft.preview?.activityItems).map((item, index) => (
            <div key={`activity-${index}`} className="border border-border bg-slate-50 p-4">
              <TextInput label="Activity Title" value={item?.title} onChange={value => handleValueChange(`preview.activityItems.${index}.title`, value)} />
              <TextInput label="Meta" value={item?.meta} onChange={value => handleValueChange(`preview.activityItems.${index}.meta`, value)} />
              <ArrayItemActions
                onMoveUp={() => handleArrayMove('preview.activityItems', index, 'up')}
                onMoveDown={() => handleArrayMove('preview.activityItems', index, 'down')}
                onRemove={() => handleArrayRemove('preview.activityItems', index)}
                disableUp={index === 0}
                disableDown={index === toArray(draft.preview?.activityItems).length - 1}
              />
            </div>
          ))}
          <button type="button" onClick={() => handleArrayAdd('preview.activityItems', SECTION_TEMPLATES['preview.activityItems'])} className="btn-secondary px-4 py-3">
            <FiPlus />
            Add Activity Item
          </button>
        </div>
      </SectionPanel>

      <SectionPanel title="Pricing Section" subtitle="All public plan cards, badges, price copy, and CTA text are editable here.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Eyebrow" value={draft.pricing?.eyebrow} onChange={value => handleValueChange('pricing.eyebrow', value)} />
          <TextInput label="Title" value={draft.pricing?.title} onChange={value => handleValueChange('pricing.title', value)} />
        </div>
        <TextAreaInput label="Description" value={draft.pricing?.description} onChange={value => handleValueChange('pricing.description', value)} rows={3} />
        <TextAreaInput label="Billing Note" value={draft.pricing?.billingNote} onChange={value => handleValueChange('pricing.billingNote', value)} rows={3} />
        <div className="space-y-4">
          {toArray(draft.pricing?.plans).map((plan, index) => (
            <div key={`plan-${index}`} className="border border-border bg-slate-50 p-4">
              <div className="grid gap-4 xl:grid-cols-3">
                <TextInput label="Plan Key" value={plan?.key} onChange={value => handleValueChange(`pricing.plans.${index}.key`, value)} />
                <TextInput label="Plan Name" value={plan?.name} onChange={value => handleValueChange(`pricing.plans.${index}.name`, value)} />
                <TextInput label="Badge" value={plan?.badge} onChange={value => handleValueChange(`pricing.plans.${index}.badge`, value)} />
                <TextInput label="Price Label" value={plan?.priceLabel} onChange={value => handleValueChange(`pricing.plans.${index}.priceLabel`, value)} />
                <TextInput label="Period Label" value={plan?.periodLabel} onChange={value => handleValueChange(`pricing.plans.${index}.periodLabel`, value)} />
                <ToggleField label="Highlight This Plan" checked={plan?.isHighlighted} onChange={value => handleValueChange(`pricing.plans.${index}.isHighlighted`, value)} />
              </div>
              <TextAreaInput label="Tagline" value={plan?.tagline} onChange={value => handleValueChange(`pricing.plans.${index}.tagline`, value)} rows={3} />
              <div className="grid gap-4 xl:grid-cols-2">
                <TextInput label="CTA Label" value={plan?.ctaLabel} onChange={value => handleValueChange(`pricing.plans.${index}.ctaLabel`, value)} />
                <TextInput label="CTA Link" value={plan?.ctaHref} onChange={value => handleValueChange(`pricing.plans.${index}.ctaHref`, value)} />
              </div>
              <TextAreaInput label="Footnote" value={plan?.footnote} onChange={value => handleValueChange(`pricing.plans.${index}.footnote`, value)} rows={3} />
              <ArrayStringEditor
                label="Limits"
                values={toArray(plan?.limits)}
                onAdd={() => handleArrayAdd(`pricing.plans.${index}.limits`, 'New limit')}
                onChange={(itemIndex, value) => handleValueChange(`pricing.plans.${index}.limits.${itemIndex}`, value)}
                addLabel="Add Limit"
              />
              <ArrayStringEditor
                label="Features"
                values={toArray(plan?.features)}
                onAdd={() => handleArrayAdd(`pricing.plans.${index}.features`, 'new_feature_key')}
                onChange={(itemIndex, value) => handleValueChange(`pricing.plans.${index}.features.${itemIndex}`, value)}
                addLabel="Add Feature"
              />
              <ArrayItemActions
                onMoveUp={() => handleArrayMove('pricing.plans', index, 'up')}
                onMoveDown={() => handleArrayMove('pricing.plans', index, 'down')}
                onRemove={() => handleArrayRemove('pricing.plans', index)}
                disableUp={index === 0}
                disableDown={index === toArray(draft.pricing?.plans).length - 1}
              />
            </div>
          ))}
          <button type="button" onClick={() => handleArrayAdd('pricing.plans', SECTION_TEMPLATES['pricing.plans'])} className="btn-secondary px-4 py-3">
            <FiPlus />
            Add Pricing Plan
          </button>
        </div>
      </SectionPanel>

      <SectionPanel title="Free Trial / CTA Section" subtitle="Mid-page conversion block used to drive trial and demo action.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Eyebrow" value={draft.cta?.eyebrow} onChange={value => handleValueChange('cta.eyebrow', value)} />
          <TextInput label="Title" value={draft.cta?.title} onChange={value => handleValueChange('cta.title', value)} />
          <TextInput label="Primary CTA Label" value={draft.cta?.primaryCtaLabel} onChange={value => handleValueChange('cta.primaryCtaLabel', value)} />
          <TextInput label="Primary CTA Link" value={draft.cta?.primaryCtaHref} onChange={value => handleValueChange('cta.primaryCtaHref', value)} />
          <TextInput label="Secondary CTA Label" value={draft.cta?.secondaryCtaLabel} onChange={value => handleValueChange('cta.secondaryCtaLabel', value)} />
          <TextInput label="Secondary CTA Link" value={draft.cta?.secondaryCtaHref} onChange={value => handleValueChange('cta.secondaryCtaHref', value)} />
        </div>
        <TextAreaInput label="Description" value={draft.cta?.description} onChange={value => handleValueChange('cta.description', value)} rows={3} />
        <ArrayStringEditor
          label="Checkpoints"
          values={toArray(draft.cta?.checkpoints)}
          onAdd={() => handleArrayAdd('cta.checkpoints', 'New checkpoint')}
          onChange={(index, value) => handleValueChange(`cta.checkpoints.${index}`, value)}
          addLabel="Add Checkpoint"
        />
      </SectionPanel>

      <SectionPanel title="Testimonials" subtitle="Client proof cards shown on the public page.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Eyebrow" value={draft.testimonials?.eyebrow} onChange={value => handleValueChange('testimonials.eyebrow', value)} />
          <TextInput label="Title" value={draft.testimonials?.title} onChange={value => handleValueChange('testimonials.title', value)} />
        </div>
        <TextAreaInput label="Description" value={draft.testimonials?.description} onChange={value => handleValueChange('testimonials.description', value)} rows={3} />
        <div className="space-y-4">
          {toArray(draft.testimonials?.items).map((item, index) => (
            <div key={`testimonial-${index}`} className="border border-border bg-slate-50 p-4">
              <TextAreaInput label="Quote" value={item?.quote} onChange={value => handleValueChange(`testimonials.items.${index}.quote`, value)} rows={4} />
              <div className="grid gap-4 xl:grid-cols-4">
                <TextInput label="Name" value={item?.name} onChange={value => handleValueChange(`testimonials.items.${index}.name`, value)} />
                <TextInput label="Role" value={item?.role} onChange={value => handleValueChange(`testimonials.items.${index}.role`, value)} />
                <TextInput label="Institution" value={item?.institution} onChange={value => handleValueChange(`testimonials.items.${index}.institution`, value)} />
                <TextInput label="Rating" type="number" min="1" max="5" value={item?.rating} onChange={value => handleValueChange(`testimonials.items.${index}.rating`, Number(value || 5))} />
              </div>
              <ImageUploadField
                label="Avatar Image"
                helper="Optional client avatar."
                fieldPath={`testimonials.items.${index}.avatarUrl`}
                currentUrl={item?.avatarUrl}
                uploadingField={uploadingField}
                onUpload={handleAssetUpload}
              />
              <ArrayItemActions
                onMoveUp={() => handleArrayMove('testimonials.items', index, 'up')}
                onMoveDown={() => handleArrayMove('testimonials.items', index, 'down')}
                onRemove={() => handleArrayRemove('testimonials.items', index)}
                disableUp={index === 0}
                disableDown={index === toArray(draft.testimonials?.items).length - 1}
              />
            </div>
          ))}
          <button type="button" onClick={() => handleArrayAdd('testimonials.items', SECTION_TEMPLATES['testimonials.items'])} className="btn-secondary px-4 py-3">
            <FiPlus />
            Add Testimonial
          </button>
        </div>
      </SectionPanel>

      <SectionPanel title="FAQ Section" subtitle="Question and answer content for objection handling.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Eyebrow" value={draft.faq?.eyebrow} onChange={value => handleValueChange('faq.eyebrow', value)} />
          <TextInput label="Title" value={draft.faq?.title} onChange={value => handleValueChange('faq.title', value)} />
        </div>
        <TextAreaInput label="Description" value={draft.faq?.description} onChange={value => handleValueChange('faq.description', value)} rows={3} />
        <div className="space-y-4">
          {toArray(draft.faq?.items).map((item, index) => (
            <div key={`faq-${index}`} className="border border-border bg-slate-50 p-4">
              <TextInput label="Question" value={item?.question} onChange={value => handleValueChange(`faq.items.${index}.question`, value)} />
              <TextAreaInput label="Answer" value={item?.answer} onChange={value => handleValueChange(`faq.items.${index}.answer`, value)} rows={4} />
              <ArrayItemActions
                onMoveUp={() => handleArrayMove('faq.items', index, 'up')}
                onMoveDown={() => handleArrayMove('faq.items', index, 'down')}
                onRemove={() => handleArrayRemove('faq.items', index)}
                disableUp={index === 0}
                disableDown={index === toArray(draft.faq?.items).length - 1}
              />
            </div>
          ))}
          <button type="button" onClick={() => handleArrayAdd('faq.items', SECTION_TEMPLATES['faq.items'])} className="btn-secondary px-4 py-3">
            <FiPlus />
            Add FAQ Item
          </button>
        </div>
      </SectionPanel>

      <SectionPanel title="Contact / Demo Section" subtitle="Public contact information and action cards for demo or trial requests.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Eyebrow" value={draft.contact?.eyebrow} onChange={value => handleValueChange('contact.eyebrow', value)} />
          <TextInput label="Title" value={draft.contact?.title} onChange={value => handleValueChange('contact.title', value)} />
          <TextInput label="Email" value={draft.contact?.email} onChange={value => handleValueChange('contact.email', value)} />
          <TextInput label="Phone" value={draft.contact?.phone} onChange={value => handleValueChange('contact.phone', value)} />
          <TextInput label="Primary CTA Label" value={draft.contact?.primaryCtaLabel} onChange={value => handleValueChange('contact.primaryCtaLabel', value)} />
          <TextInput label="Primary CTA Link" value={draft.contact?.primaryCtaHref} onChange={value => handleValueChange('contact.primaryCtaHref', value)} />
          <TextInput label="Secondary CTA Label" value={draft.contact?.secondaryCtaLabel} onChange={value => handleValueChange('contact.secondaryCtaLabel', value)} />
          <TextInput label="Secondary CTA Link" value={draft.contact?.secondaryCtaHref} onChange={value => handleValueChange('contact.secondaryCtaHref', value)} />
        </div>
        <TextAreaInput label="Description" value={draft.contact?.description} onChange={value => handleValueChange('contact.description', value)} rows={3} />
        <TextAreaInput label="Address" value={draft.contact?.address} onChange={value => handleValueChange('contact.address', value)} rows={3} />
        <div className="space-y-4">
          {toArray(draft.contact?.cards).map((item, index) => (
            <div key={`contact-card-${index}`} className="border border-border bg-slate-50 p-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <TextInput label="Card Title" value={item?.title} onChange={value => handleValueChange(`contact.cards.${index}.title`, value)} />
                <TextInput label="CTA Label" value={item?.ctaLabel} onChange={value => handleValueChange(`contact.cards.${index}.ctaLabel`, value)} />
              </div>
              <TextInput label="CTA Link" value={item?.ctaHref} onChange={value => handleValueChange(`contact.cards.${index}.ctaHref`, value)} />
              <TextAreaInput label="Card Description" value={item?.description} onChange={value => handleValueChange(`contact.cards.${index}.description`, value)} rows={3} />
              <ArrayItemActions
                onMoveUp={() => handleArrayMove('contact.cards', index, 'up')}
                onMoveDown={() => handleArrayMove('contact.cards', index, 'down')}
                onRemove={() => handleArrayRemove('contact.cards', index)}
                disableUp={index === 0}
                disableDown={index === toArray(draft.contact?.cards).length - 1}
              />
            </div>
          ))}
          <button type="button" onClick={() => handleArrayAdd('contact.cards', SECTION_TEMPLATES['contact.cards'])} className="btn-secondary px-4 py-3">
            <FiPlus />
            Add Contact Card
          </button>
        </div>
      </SectionPanel>

      <SectionPanel title="Footer" subtitle="Brand footer copy and public quick links.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextInput label="Brand Title" value={draft.footer?.brandTitle} onChange={value => handleValueChange('footer.brandTitle', value)} />
          <TextAreaInput label="Brand Description" value={draft.footer?.brandDescription} onChange={value => handleValueChange('footer.brandDescription', value)} rows={3} />
        </div>
        <TextAreaInput label="Copyright" value={draft.footer?.copyright} onChange={value => handleValueChange('footer.copyright', value)} rows={3} />
        <div className="space-y-4">
          {toArray(draft.footer?.links).map((item, index) => (
            <div key={`footer-link-${index}`} className="border border-border bg-slate-50 p-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <TextInput label="Link Label" value={item?.label} onChange={value => handleValueChange(`footer.links.${index}.label`, value)} />
                <TextInput label="Link URL" value={item?.href} onChange={value => handleValueChange(`footer.links.${index}.href`, value)} />
              </div>
              <ArrayItemActions
                onMoveUp={() => handleArrayMove('footer.links', index, 'up')}
                onMoveDown={() => handleArrayMove('footer.links', index, 'down')}
                onRemove={() => handleArrayRemove('footer.links', index)}
                disableUp={index === 0}
                disableDown={index === toArray(draft.footer?.links).length - 1}
              />
            </div>
          ))}
          <button type="button" onClick={() => handleArrayAdd('footer.links', SECTION_TEMPLATES['footer.links'])} className="btn-secondary px-4 py-3">
            <FiPlus />
            Add Footer Link
          </button>
        </div>
      </SectionPanel>
    </div>
  );
}
