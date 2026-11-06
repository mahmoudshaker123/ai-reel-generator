'use client';
import React, { useState } from 'react';
import { Palette, Plus, Upload, Check, Trash2, Sliders, Type, Shield } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

interface BrandKit {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  font: string;
  watermarkEnabled: boolean;
  handle: string;
}

export default function BrandKitsPage() {
  const [kits, setKits] = useState<BrandKit[]>([
    {
      id: 'default',
      name: 'الهوية الأساسية (Default)',
      primaryColor: '#264d40',
      accentColor: '#eab308',
      font: 'Cairo Black + Cairo Bold',
      watermarkEnabled: false,
      handle: '@myhandle',
    },
  ]);

  const [activeKitId, setActiveKitId] = useState<string>('default');
  const [isCreating, setIsCreating] = useState(false);
  const [newKitName, setNewKitName] = useState('');

  const currentKit = kits.find((k) => k.id === activeKitId) || kits[0];

  const handleCreateKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKitName.trim()) return;
    const newKit: BrandKit = {
      id: `kit_${Date.now()}`,
      name: newKitName.trim(),
      primaryColor: '#10b981',
      accentColor: '#f59e0b',
      font: 'Cairo Bold',
      watermarkEnabled: false,
      handle: '@creator',
    };
    setKits([...kits, newKit]);
    setActiveKitId(newKit.id);
    setNewKitName('');
    setIsCreating(false);
  };

  const updateCurrentKit = (partial: Partial<BrandKit>) => {
    setKits(kits.map((k) => (k.id === currentKit.id ? { ...k, ...partial } : k)));
  };

  return (
    <AppShell>
      <div style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '36px 36px 80px',
        width: '100%',
        boxSizing: 'border-box',
        color: '#233d34',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#233d34',
              margin: '0 0 8px 0',
            }}>
              هويات البراند (Brand Kits)
            </h1>
            <p style={{ fontSize: 14.5, color: '#62756b', margin: 0 }}>
              ألوانك، خطوطك، ولوجو حسابك لتطبيقها تلقائياً على كل ريل تقوم بإنتاجه.
            </p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            style={{
              background: '#294f40',
              color: '#ffffff',
              border: 'none',
              borderRadius: 9,
              padding: '10px 18px',
              fontSize: 13.5,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(41, 79, 64, 0.25)',
            }}
          >
            <Plus size={16} />
            <span>إضافة هوية براند جديدة</span>
          </button>
        </div>

        {/* Modal for creating a new kit */}
        {isCreating && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(35, 61, 52, 0.45)',
            backdropFilter: 'blur(6px)',
            zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}>
            <form onSubmit={handleCreateKit} style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 14,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 16px 40px rgba(36, 62, 53, 0.15)',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#233d34', fontWeight: 800 }}>
                إضافة هوية براند جديدة
              </h3>
              <input
                type="text"
                autoFocus
                placeholder="اسم الهوية (مثال: قناة اليوتيوب، تيك توك)"
                value={newKitName}
                onChange={(e) => setNewKitName(e.target.value)}
                style={{
                  width: '100%',
                  height: 42,
                  background: '#f8faf6',
                  border: '1px solid #dfe4da',
                  borderRadius: 8,
                  padding: '0 12px',
                  color: '#233d34',
                  fontSize: 13.5,
                  marginBottom: 18,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #dfe4da',
                    color: '#64746b',
                    padding: '8px 16px',
                    borderRadius: 7,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#294f40',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: 7,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  حفظ الهوية
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Brand Kit Editor Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 24,
          alignItems: 'start',
        }}>
          {/* Left Kits List */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dfe4da',
            borderRadius: 14,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            boxShadow: '0 2px 8px rgba(36, 62, 53, 0.03)',
          }}>
            {kits.map((k) => (
              <button
                key={k.id}
                onClick={() => setActiveKitId(k.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: k.id === currentKit.id ? '1px solid #294f40' : '1px solid transparent',
                  background: k.id === currentKit.id ? '#edf3ec' : 'transparent',
                  color: k.id === currentKit.id ? '#294f40' : '#57675e',
                  fontSize: 13,
                  fontWeight: k.id === currentKit.id ? 700 : 600,
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                <span>{k.name}</span>
                {k.id === currentKit.id && <Check size={15} color="#294f40" strokeWidth={2.5} />}
              </button>
            ))}
          </div>

          {/* Right Kit Customization Panel */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dfe4da',
            borderRadius: 14,
            padding: '26px 28px',
            boxShadow: '0 2px 8px rgba(36, 62, 53, 0.03)',
          }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: '#233d34', margin: '0 0 20px 0' }}>
              {currentKit.name}
            </h2>

            <div style={{ display: 'grid', gap: 20 }}>
              {/* Colors */}
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#233d34', marginBottom: 8, fontWeight: 700 }}>
                  ألوان الهوية (اللون الأساسي ولون الإبراز)
                </label>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={currentKit.primaryColor}
                      onChange={(e) => updateCurrentKit({ primaryColor: e.target.value })}
                      style={{ width: 38, height: 38, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent' }}
                    />
                    <div>
                      <div style={{ fontSize: 11, color: '#718077' }}>اللون الأساسي</div>
                      <div style={{ fontSize: 12.5, color: '#233d34', fontFamily: 'monospace', fontWeight: 600 }}>
                        {currentKit.primaryColor}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={currentKit.accentColor}
                      onChange={(e) => updateCurrentKit({ accentColor: e.target.value })}
                      style={{ width: 38, height: 38, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent' }}
                    />
                    <div>
                      <div style={{ fontSize: 11, color: '#718077' }}>لون التحديد والإبراز</div>
                      <div style={{ fontSize: 12.5, color: '#233d34', fontFamily: 'monospace', fontWeight: 600 }}>
                        {currentKit.accentColor}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Handle */}
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#233d34', marginBottom: 6, fontWeight: 700 }}>
                  معرّف الحساب (Social Handle)
                </label>
                <input
                  type="text"
                  value={currentKit.handle}
                  onChange={(e) => updateCurrentKit({ handle: e.target.value })}
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    height: 40,
                    background: '#f8faf6',
                    border: '1px solid #dfe4da',
                    borderRadius: 8,
                    padding: '0 12px',
                    color: '#233d34',
                    fontSize: 13.5,
                    direction: 'ltr',
                    textAlign: 'right',
                  }}
                />
              </div>

              {/* Watermark toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="watermark-toggle"
                  checked={currentKit.watermarkEnabled}
                  onChange={(e) => updateCurrentKit({ watermarkEnabled: e.target.checked })}
                  style={{ accentColor: '#294f40', width: 17, height: 17 }}
                />
                <label htmlFor="watermark-toggle" style={{ fontSize: 13.5, color: '#233d34', cursor: 'pointer', fontWeight: 600 }}>
                  تضمين لوجو أو ووترمارك مخصص في زاوية الفيديو تلقائياً
                </label>
              </div>

              {/* Save Button */}
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => alert('تم حفظ تفاصيل هوية البراند بنجاح!')}
                  style={{
                    background: '#294f40',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 22px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  حفظ تفاصيل الهوية
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
