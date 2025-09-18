// Mock API with localStorage persistence and artificial latency

import {
  seedUsers,
  seedShipments,
  seedProducts,
  seedPartners,
  seedCompany,
  seedHsCodes,
  calculateKPIs,
  type User,
  type Shipment,
  type KPI,
  type Product,
  type Partner,
  type ShipmentWithItems,
  type ShipmentItem,
  type ShipmentDocument,
  type DocVersion,
  type DocStatus,
  type Company,
  type HsCode,
  type SavedHsRate
} from './seeds';
import { 
  seedIssues, 
  seedIssueComments, 
  seedEvents 
} from './issues-seeds';
import type {
  Issue,
  IssueComment,
  Event,
  IssueStatus,
  IssueSeverity,
  CostLine,
  CostType,
  Payment,
  PaymentMethod,
  CostSummary,
  OrgSettings,
  BrandSettings,
  TemplateMeta,
  TemplateKey,
  AppUserSummary,
  AppRole,
} from './types';
import { getSavedHsRate, saveHsRate as storageSaveHsRate } from '@/utils/storage';
import { percent, roundFcfa } from '@/utils/math';
import { evaluateRules, type DocKey } from '@/utils/rules';
import { renderInvoicePDF, renderPackingListPDF, renderProformaPDF, renderReceiptPDF } from '@/utils/pdf';
import { nextInvoiceNumber, nextPackingListNumber } from '@/utils/numbering';
import { toCsv } from '@/utils/csv';
import { formatFcfa } from '@/utils/currency';
import { applyBrandToCssVars } from '@/utils/theme';
import { fileToDataUrl } from '@/utils/file';

const STORAGE_PREFIX = 'prolist_mvp_';
const LATENCY_MIN = 300;
const LATENCY_MAX = 600;

const DEFAULT_ORG_SETTINGS: OrgSettings = {
  name: 'ProList Manufacturing Ltd',
  country: 'CM',
  city: 'Bamenda',
  address: 'Mile 3 Nkwen, Bamenda',
  tax_id: 'CM-PL-009988',
};

const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  primary: '#048ABF',
  accentBlue: '#049DBF',
  accentTeal: '#03A6A6',
  accentGreen: '#0AA66D',
  accentMint: '#0FBF6D',
};

// Utility to simulate network latency
const delay = (ms?: number): Promise<void> => {
  const actualDelay = ms || Math.floor(Math.random() * (LATENCY_MAX - LATENCY_MIN + 1)) + LATENCY_MIN;
  return new Promise(resolve => setTimeout(resolve, actualDelay));
};

// Storage utilities
const getStorageKey = (key: string): string => `${STORAGE_PREFIX}${key}`;

const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(getStorageKey(key));
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// Initialize storage on first load
const initializeStorage = (): void => {
  if (!getFromStorage('initialized', false)) {
    setToStorage('users', seedUsers);
    setToStorage('shipments', seedShipments.map(s => ({ ...s, items: s.items || [] })));
    setToStorage('products', seedProducts);
    setToStorage('partners', seedPartners);
    setToStorage('issues', seedIssues);
    setToStorage('issue_comments', seedIssueComments);
    setToStorage('events', seedEvents);
    setToStorage('org_settings', DEFAULT_ORG_SETTINGS);
    setToStorage('brand_settings', DEFAULT_BRAND_SETTINGS);
    setToStorage('templates', []);
    applyBrandToCssVars(DEFAULT_BRAND_SETTINGS);

    // Initialize cost lines and payments with seed data
    const seedCostLines: CostLine[] = [
      {
        id: 'cost_1',
        shipment_id: 's_5001',
        type: 'freight',
        label: 'Sea freight to Le Havre',
        amount_fcfa: 2000000,
        taxable: true,
        tax_rate_pct: 5.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'cost_2',
        shipment_id: 's_5001',
        type: 'fees',
        label: 'Export documentation',
        amount_fcfa: 150000,
        taxable: false,
        tax_rate_pct: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'cost_3',
        shipment_id: 's_5001',
        type: 'insurance',
        label: 'Marine cargo insurance',
        amount_fcfa: 300000,
        taxable: true,
        tax_rate_pct: 5.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    const seedPayments: Payment[] = [
      {
        id: 'payment_1',
        shipment_id: 's_5001',
        method: 'bank_transfer',
        amount_fcfa: 1000000,
        reference: 'TXN-20250917-001',
        paid_at: new Date().toISOString(),
        note: 'Partial payment - freight advance',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    setToStorage('cost_lines', seedCostLines);
    setToStorage('payments', seedPayments);
    setToStorage('initialized', true);
    console.log('ProList: Mock data initialized');
  }
};

// Call initialization
initializeStorage();

const ensureStored = <T>(key: string, fallback: T): T => {
  const storageKey = getStorageKey(key);
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    setToStorage(key, fallback);
    return fallback;
  }
  return getFromStorage<T>(key, fallback);
};

const getOrgSettingsFromStorage = (): OrgSettings => ensureStored('org_settings', DEFAULT_ORG_SETTINGS);
const getBrandSettingsFromStorage = (): BrandSettings => ensureStored('brand_settings', DEFAULT_BRAND_SETTINGS);
const getTemplatesFromStorage = (): TemplateMeta[] => ensureStored<TemplateMeta[]>('templates', []);

// Mock API functions
export const mockApi = {
  // Authentication
  async login(email: string, role?: string): Promise<{ user: User; token: string }> {
    await delay();
    
    const users = getFromStorage<User[]>('users', seedUsers);
    let user = users.find(u => u.email === email);

    // If user not found but email provided, create a demo user
    if (!user && email) {
      user = {
        id: `u_${Date.now()}`,
        email,
        name: email.split('@')[0],
        role: (role as User['role']) || 'exporter_admin',
        created_at: new Date().toISOString(),
      };
      users.push(user);
      setToStorage('users', users);
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.created_at) {
      user.created_at = new Date().toISOString();
      const index = users.findIndex(u => u.id === user.id);
      if (index >= 0) {
        users[index] = user;
        setToStorage('users', users);
      }
    }

    const token = `demo_token_${user.id}_${Date.now()}`;
    setToStorage('current_user', user);
    setToStorage('auth_token', token);
    
    return { user, token };
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(100); // Shorter delay for auth checks
    return getFromStorage<User | null>('current_user', null);
  },

  async logout(): Promise<void> {
    await delay(200);
    localStorage.removeItem(getStorageKey('current_user'));
    localStorage.removeItem(getStorageKey('auth_token'));
  },

  // Settings - Organisation
  async getOrgSettings(): Promise<OrgSettings> {
    await delay();
    return getOrgSettingsFromStorage();
  },

  async saveOrgSettings(patch: Partial<OrgSettings>): Promise<OrgSettings> {
    await delay();
    const current = getOrgSettingsFromStorage();
    const updated = { ...current, ...patch };
    setToStorage('org_settings', updated);
    return updated;
  },

  // Settings - Branding
  async getBrandSettings(): Promise<BrandSettings> {
    await delay();
    return getBrandSettingsFromStorage();
  },

  async saveBrandSettings(patch: Partial<BrandSettings>): Promise<BrandSettings> {
    await delay();
    const current = getBrandSettingsFromStorage();
    const updated: BrandSettings = {
      ...current,
      ...patch,
    };
    setToStorage('brand_settings', updated);
    applyBrandToCssVars(updated);
    return updated;
  },

  async resetBrandSettings(): Promise<BrandSettings> {
    await delay();
    setToStorage('brand_settings', DEFAULT_BRAND_SETTINGS);
    applyBrandToCssVars(DEFAULT_BRAND_SETTINGS);
    return DEFAULT_BRAND_SETTINGS;
  },

  // Settings - Templates
  async listTemplates(): Promise<TemplateMeta[]> {
    await delay();
    const templates = getTemplatesFromStorage();
    return templates.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  },

  async uploadTemplate({ key, file }: { key: TemplateKey; file: File }): Promise<TemplateMeta> {
    await delay();
    const templates = getTemplatesFromStorage();
    const dataUrl = await fileToDataUrl(file);
    const uploader = getFromStorage<User | null>('current_user', null);
    const newTemplate: TemplateMeta = {
      id: `tpl_${Date.now()}`,
      key,
      fileName: file.name,
      sizeBytes: file.size,
      uploaded_at: new Date().toISOString(),
      uploaded_by: uploader?.id ?? 'system',
      dataUrl,
      active: false,
    };

    templates.push(newTemplate);
    setToStorage('templates', templates);
    return newTemplate;
  },

  async setActiveTemplate(id: string): Promise<TemplateMeta[]> {
    await delay();
    const templates = getTemplatesFromStorage();
    const target = templates.find(t => t.id === id);
    if (!target) {
      return templates;
    }

    const updated = templates.map(template =>
      template.key === target.key
        ? { ...template, active: template.id === id }
        : template
    );

    setToStorage('templates', updated);
    return updated;
  },

  async deleteTemplate(id: string): Promise<void> {
    await delay();
    const templates = getTemplatesFromStorage();
    const filtered = templates.filter(template => template.id !== id);
    setToStorage('templates', filtered);
  },

  // Settings - Users & roles
  async listUsers(): Promise<AppUserSummary[]> {
    await delay();
    const users = getFromStorage<User[]>('users', seedUsers);
    let mutated = false;
    const normalised = users.map(user => {
      if (!user.created_at) {
        mutated = true;
        return { ...user, created_at: new Date().toISOString() } as User;
      }
      return user;
    });

    if (mutated) {
      setToStorage('users', normalised);
    }

    return normalised.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    }));
  },

  async updateUserRole(userId: string, role: AppRole): Promise<AppUserSummary> {
    await delay();
    const users = getFromStorage<User[]>('users', seedUsers);
    const index = users.findIndex(user => user.id === userId);
    if (index === -1) {
      throw new Error('User not found');
    }

    users[index] = { ...users[index], role };
    setToStorage('users', users);

    const currentUser = getFromStorage<User | null>('current_user', null);
    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, role };
      setToStorage('current_user', updatedUser);
    }

    const updated = users[index];
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      created_at: updated.created_at,
    };
  },

  // Settings - Workspace
  async exportWorkspace(): Promise<{ fileName: string; dataUrl: string }> {
    await delay();
    const data: Record<string, unknown> = {};
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        }
      });

    const payload = JSON.stringify(data, null, 2);
    const encoded = window.btoa(unescape(encodeURIComponent(payload)));
    const fileName = `${new Date().toISOString().replace(/[:.]/g, '-')}-prolist-workspace.json`;
    return {
      fileName,
      dataUrl: `data:application/json;base64,${encoded}`,
    };
  },

  async importWorkspace(file: File): Promise<void> {
    await delay();
    const text = await file.text();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error('Invalid workspace file');
    }

    const keys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));

    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof key === 'string' && key.startsWith(STORAGE_PREFIX)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });

    setToStorage('initialized', true);

    if (!Object.prototype.hasOwnProperty.call(parsed, getStorageKey('brand_settings'))) {
      setToStorage('brand_settings', DEFAULT_BRAND_SETTINGS);
    }

    applyBrandToCssVars(getBrandSettingsFromStorage());
  },

  // Shipments
  async listShipments(search?: string): Promise<ShipmentWithItems[]> {
    await delay();
    
    let shipments = getFromStorage<ShipmentWithItems[]>('shipments', []);
    
    if (search) {
      const searchLower = search.toLowerCase();
      shipments = shipments.filter(s => 
        s.reference.toLowerCase().includes(searchLower) ||
        s.buyer.toLowerCase().includes(searchLower)
      );
    }
    
    return shipments.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  async getShipment(id: string): Promise<ShipmentWithItems | null> {
    await delay();
    const shipments = getFromStorage<ShipmentWithItems[]>('shipments', []);
    return shipments.find(s => s.id === id) || null;
  },

  // KPIs
  async getKpis(): Promise<KPI[]> {
    await delay();
    const shipments = getFromStorage<ShipmentWithItems[]>('shipments', []);
    return calculateKPIs(shipments);
  },

  // Demo utilities
  async resetDemo(): Promise<void> {
    await delay();

    // Clear all ProList data
    const keys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));

    // Reinitialize
    initializeStorage();
    applyBrandToCssVars(DEFAULT_BRAND_SETTINGS);

    console.log('ProList: Demo data reset');
  },

  clearStorage(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
    applyBrandToCssVars(DEFAULT_BRAND_SETTINGS);
  },

  // Create shipment
  async createShipment(shipmentData: Omit<ShipmentWithItems, 'id' | 'updated_at'>): Promise<ShipmentWithItems> {
    await delay();
    
    const shipments = getFromStorage<ShipmentWithItems[]>('shipments', []);
    const now = new Date().toISOString().split('T')[0];
    const newShipment: ShipmentWithItems = {
      ...shipmentData,
      id: `s_${Date.now()}`,
      updated_at: now,
    };
    
    shipments.push(newShipment);
    setToStorage('shipments', shipments);
    
    // Add creation event
    await this.addEvent({
      id: `event_${Date.now()}`,
      shipment_id: newShipment.id,
      type: 'shipment_created',
      at: new Date().toISOString(),
      by: 'current_user', // In real app, get from auth
      payload: { reference: newShipment.reference },
    });
    
    return newShipment;
  },

  // Update shipment
  async updateShipment(id: string, updates: Partial<ShipmentWithItems>): Promise<ShipmentWithItems> {
    await delay();
    
    const shipments = getFromStorage<ShipmentWithItems[]>('shipments', []);
    const index = shipments.findIndex(s => s.id === id);
    
    if (index === -1) {
      throw new Error('Shipment not found');
    }
    
    const oldShipment = shipments[index];
    shipments[index] = {
      ...shipments[index],
      ...updates,
      updated_at: new Date().toISOString().split('T')[0],
    };
    
    setToStorage('shipments', shipments);
    
    // Add events for important changes
    const now = new Date().toISOString();
    if (updates.status === 'submitted' && oldShipment.status !== 'submitted') {
      await this.addEvent({
        id: `event_${Date.now()}`,
        shipment_id: id,
        type: 'shipment_submitted',
        at: now,
        by: 'current_user',
      });
    } else if (updates.status || updates.buyer || updates.value_fcfa) {
      await this.addEvent({
        id: `event_${Date.now()}`,
        shipment_id: id,
        type: 'shipment_updated',
        at: now,
        by: 'current_user',
        payload: updates,
      });
    }
    
    return shipments[index];
  },

  // Delete shipment
  async deleteShipment(id: string): Promise<void> {
    await delay();
    
    const shipments = getFromStorage<ShipmentWithItems[]>('shipments', []);
    const filtered = shipments.filter(s => s.id !== id);
    setToStorage('shipments', filtered);
  },

  // Products
  async listProducts(): Promise<Product[]> {
    await delay();
    return getFromStorage<Product[]>('products', seedProducts);
  },

  // Partners
  async listPartners(): Promise<Partner[]> {
    await delay();
    return getFromStorage<Partner[]>('partners', seedPartners);
  },

  async createPartner(partnerData: Omit<Partner, 'id'>): Promise<Partner> {
    await delay();
    
    const partners = getFromStorage<Partner[]>('partners', seedPartners);
    const newPartner: Partner = {
      ...partnerData,
      id: `partner_${Date.now()}`,
    };
    
    partners.push(newPartner);
    setToStorage('partners', partners);
    
    return newPartner;
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!getFromStorage('current_user', null);
  },

  // Get auth token
  getAuthToken(): string | null {
    return getFromStorage('auth_token', null);
  },

  // Documents API
  async listShipmentDocuments(shipmentId: string): Promise<ShipmentDocument[]> {
    await delay();
    
    const shipment = getFromStorage<ShipmentWithItems[]>('shipments', [])
      .find(s => s.id === shipmentId);
    const products = getFromStorage<Product[]>('products', seedProducts);
    
    if (!shipment) return [];
    
    const allDocs = getFromStorage<ShipmentDocument[]>('documents', []);
    const shipmentDocs = allDocs.filter(doc => doc.shipment_id === shipmentId);
    
    // Evaluate rules to ensure required documents exist
    const requirements = evaluateRules(shipment, products);
    
    // Ensure each required document exists in the catalogue
    for (const docKey of requirements.required) {
      const existing = shipmentDocs.find(doc => doc.doc_key === docKey);
      if (!existing) {
        const newDoc: ShipmentDocument = {
          id: `doc_${Date.now()}_${docKey}`,
          shipment_id: shipmentId,
          doc_key: docKey,
          status: 'required',
          versions: [],
        };
        shipmentDocs.push(newDoc);
        allDocs.push(newDoc);
      }
    }
    
    // Add commercial documents (Invoice, Packing List) if not present
    const commercialDocs: DocKey[] = ['INVOICE' as DocKey, 'PACKING_LIST' as DocKey];
    for (const docKey of commercialDocs) {
      const existing = shipmentDocs.find(doc => doc.doc_key === docKey);
      if (!existing) {
        const newDoc: ShipmentDocument = {
          id: `doc_${Date.now()}_${docKey}`,
          shipment_id: shipmentId,
          doc_key: docKey,
          status: 'required',
          versions: [],
        };
        shipmentDocs.push(newDoc);
        allDocs.push(newDoc);
      }
    }
    
    setToStorage('documents', allDocs);
    return shipmentDocs;
  },

  async generateDocument(
    shipmentId: string, 
    docKey: DocKey, 
    payload: { number?: string; date: string; signatureName?: string }
  ): Promise<ShipmentDocument> {
    await delay();
    
    const shipments = getFromStorage<ShipmentWithItems[]>('shipments', []);
    const products = getFromStorage<Product[]>('products', seedProducts);
    const partners = getFromStorage<Partner[]>('partners', seedPartners);
    const allDocs = getFromStorage<ShipmentDocument[]>('documents', []);
    
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment) throw new Error('Shipment not found');
    
    const buyer = partners.find(p => p.name === shipment.buyer);
    if (!buyer) throw new Error('Buyer not found');
    
    // Prepare items data
    const items = (shipment.items || []).map(item => {
      const product = products.find(p => p.id === item.product_id);
      if (!product) throw new Error('Product not found');
      return { product, quantity: item.quantity };
    });
    
    // Calculate totals
    const totals = items.reduce((acc, item) => {
      acc.value += item.product.unit_price_fcfa * item.quantity;
      acc.weight += (item.product.weight_kg || 0) * item.quantity;
      acc.items += 1;
      return acc;
    }, { value: 0, weight: 0, items: 0 });
    
    // Generate document number if not provided
    let documentNumber = payload.number;
    if (!documentNumber) {
      documentNumber = docKey === 'INVOICE' ? nextInvoiceNumber() : nextPackingListNumber();
    }
    
    const meta = {
      number: documentNumber,
      date: payload.date,
      signatureName: payload.signatureName,
    };
    
    // Generate PDF
    let pdfResult;
    if (docKey === 'INVOICE') {
      pdfResult = await renderInvoicePDF(shipment, seedCompany, buyer, items, totals, meta);
    } else if (docKey === 'PACKING_LIST') {
      pdfResult = await renderPackingListPDF(shipment, seedCompany, buyer, items, totals, meta);
    } else {
      throw new Error('Document generation not supported for this type');
    }
    
    // Find or create document
    let doc = allDocs.find(d => d.shipment_id === shipmentId && d.doc_key === docKey);
    if (!doc) {
      doc = {
        id: `doc_${Date.now()}_${docKey}`,
        shipment_id: shipmentId,
        doc_key: docKey,
        status: 'required',
        versions: [],
      };
      allDocs.push(doc);
    }
    
    // Create new version
    const newVersion: DocVersion = {
      id: `ver_${Date.now()}`,
      version: (doc.versions.length || 0) + 1,
      created_at: new Date().toISOString(),
      created_by: 'current_user', // In real app, get from auth
      fileDataUrl: pdfResult.dataUrl,
      fileName: pdfResult.fileName,
      note: `Generated ${docKey}`,
    };
    
    doc.versions.push(newVersion);
    doc.current_version = newVersion.version;
    doc.status = 'generated';
    
    setToStorage('documents', allDocs);
    
    // Add doc generated event
    await this.addEvent({
      id: `event_${Date.now()}`,
      shipment_id: shipmentId,
      type: 'doc_generated',
      at: new Date().toISOString(),
      by: 'current_user',
      payload: { doc_key: docKey, version: newVersion.version },
    });
    
    return doc;
  },

  async uploadDocumentVersion(
    shipmentId: string,
    docKey: DocKey,
    file: File,
    note?: string
  ): Promise<ShipmentDocument> {
    await delay();
    
    const allDocs = getFromStorage<ShipmentDocument[]>('documents', []);
    let doc = allDocs.find(d => d.shipment_id === shipmentId && d.doc_key === docKey);
    
    if (!doc) {
      doc = {
        id: `doc_${Date.now()}_${docKey}`,
        shipment_id: shipmentId,
        doc_key: docKey,
        status: 'required',
        versions: [],
      };
      allDocs.push(doc);
    }
    
    // Convert file to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newVersion: DocVersion = {
          id: `ver_${Date.now()}`,
          version: (doc!.versions.length || 0) + 1,
          created_at: new Date().toISOString(),
          created_by: 'current_user',
          fileDataUrl: reader.result as string,
          fileName: file.name,
          note: note || `Uploaded ${file.name}`,
        };
        
        doc!.versions.push(newVersion);
        doc!.current_version = newVersion.version;
        doc!.status = 'generated';
        
        setToStorage('documents', allDocs);
        resolve(doc!);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  async setDocumentStatus(
    shipmentId: string,
    docKey: DocKey,
    status: DocStatus,
    note?: string
  ): Promise<ShipmentDocument> {
    await delay();
    
    const allDocs = getFromStorage<ShipmentDocument[]>('documents', []);
    const doc = allDocs.find(d => d.shipment_id === shipmentId && d.doc_key === docKey);
    
    if (!doc) throw new Error('Document not found');
    
    doc.status = status;
    
    // Add note to current version if provided
    if (note && doc.current_version) {
      const currentVersion = doc.versions.find(v => v.version === doc.current_version);
      if (currentVersion) {
        currentVersion.note = note;
      }
    }
    
    setToStorage('documents', allDocs);
    
    // Add doc approved event
    if (status === 'approved') {
      await this.addEvent({
        id: `event_${Date.now()}`,
        shipment_id: shipmentId,
        type: 'doc_approved',
        at: new Date().toISOString(),
        by: 'current_user',
        payload: { doc_key: docKey, version: doc.current_version },
      });
    }
    
    return doc;
  },

  async listAllDocuments(): Promise<ShipmentDocument[]> {
    await delay();
    return getFromStorage<ShipmentDocument[]>('documents', []);
  },

  // Get company info
  async getCompany(): Promise<Company> {
    await delay();
    return seedCompany;
  },

  // HS Codes API
  async listHs(): Promise<HsCode[]> {
    await delay();
    return seedHsCodes;
  },

  async searchHs(query: string): Promise<HsCode[]> {
    await delay();
    
    if (!query.trim()) {
      return seedHsCodes;
    }
    
    const queryLower = query.toLowerCase();
    return seedHsCodes.filter(hs => 
      hs.code.includes(queryLower) || 
      hs.description.toLowerCase().includes(queryLower)
    );
  },

  async getSavedHsRate(code: string): Promise<SavedHsRate | undefined> {
    await delay(100); // Shorter delay for rate lookups
    return getSavedHsRate(code);
  },

  async saveHsRate(code: string, ratePct: number): Promise<SavedHsRate> {
    await delay();
    return storageSaveHsRate(code, ratePct);
  },

  async calculateDuty(params: { 
    hsCode: string; 
    cifValueFcfa: number; 
    ratePct?: number;
  }): Promise<{ dutyFcfa: number; effectiveRatePct: number }> {
    await delay();
    
    const hsCode = seedHsCodes.find(hs => hs.code === params.hsCode);
    const savedRate = getSavedHsRate(params.hsCode);
    
    // Use provided rate, then saved rate, then default rate
    const effectiveRatePct = params.ratePct ?? savedRate?.ratePct ?? hsCode?.defaultDutyRate ?? 0;
    const dutyFcfa = roundFcfa(percent(params.cifValueFcfa, effectiveRatePct));
    
    return {
      dutyFcfa,
      effectiveRatePct,
    };
  },

  async createAdHocProduct(input: {
    hs_code: string;
    name: string;
    unit_value_fcfa: number;
    unit_weight_kg: number;
  }): Promise<Product> {
    await delay();
    
    const products = getFromStorage<Product[]>('products', seedProducts);
    const timestamp = Date.now();
    
    const newProduct: Product = {
      id: `ADHOC-${input.hs_code}-${timestamp}`,
      name: input.name,
      hs_code: input.hs_code,
      unit_price_fcfa: input.unit_value_fcfa,
      weight_kg: input.unit_weight_kg,
    };
    
    products.push(newProduct);
    setToStorage('products', products);
    
    return newProduct;
  },

  // Issues API
  async listIssues(params?: {
    shipment_id?: string;
    status?: IssueStatus[];
    severity?: IssueSeverity[];
    assignee_id?: string;
    search?: string;
  }): Promise<Issue[]> {
    await delay();
    
    let issues = getFromStorage<Issue[]>('issues', seedIssues);
    
    // Filter by shipment if provided
    if (params?.shipment_id) {
      issues = issues.filter(issue => issue.shipment_id === params.shipment_id);
    }
    
    // Filter by status
    if (params?.status && params.status.length > 0) {
      issues = issues.filter(issue => params.status!.includes(issue.status));
    }
    
    // Filter by severity
    if (params?.severity && params.severity.length > 0) {
      issues = issues.filter(issue => params.severity!.includes(issue.severity));
    }
    
    // Filter by assignee
    if (params?.assignee_id) {
      issues = issues.filter(issue => issue.assignee_id === params.assignee_id);
    }
    
    // Filter by search (title or shipment reference)
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      const shipments = getFromStorage<ShipmentWithItems[]>('shipments', []);
      
      issues = issues.filter(issue => {
        const titleMatch = issue.title.toLowerCase().includes(searchLower);
        const shipment = shipments.find(s => s.id === issue.shipment_id);
        const refMatch = shipment?.reference.toLowerCase().includes(searchLower);
        return titleMatch || refMatch;
      });
    }
    
    return issues.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  async getIssue(id: string): Promise<Issue | null> {
    await delay();
    const issues = getFromStorage<Issue[]>('issues', seedIssues);
    return issues.find(issue => issue.id === id) || null;
  },

  async createIssue(input: Partial<Issue> & { title: string; shipment_id: string }): Promise<Issue> {
    await delay();
    
    const issues = getFromStorage<Issue[]>('issues', seedIssues);
    const now = new Date().toISOString();
    
    const newIssue: Issue = {
      id: `issue_${Date.now()}`,
      severity: 'medium',
      status: 'open',
      created_at: now,
      updated_at: now,
      ...input,
    };
    
    issues.push(newIssue);
    setToStorage('issues', issues);
    
    // Add event
    await this.addEvent({
      id: `event_${Date.now()}`,
      shipment_id: newIssue.shipment_id,
      type: 'issue_opened',
      at: now,
      by: 'current_user', // In real app, get from auth
      payload: { issue_id: newIssue.id, title: newIssue.title },
    });
    
    return newIssue;
  },

  async updateIssue(id: string, patch: Partial<Omit<Issue, 'id' | 'created_at'>>): Promise<Issue> {
    await delay();
    
    const issues = getFromStorage<Issue[]>('issues', seedIssues);
    const issueIndex = issues.findIndex(issue => issue.id === id);
    
    if (issueIndex === -1) {
      throw new Error('Issue not found');
    }
    
    const oldIssue = issues[issueIndex];
    const updatedIssue = {
      ...oldIssue,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    
    issues[issueIndex] = updatedIssue;
    setToStorage('issues', issues);
    
    // Add event if status changed
    if (patch.status && patch.status !== oldIssue.status) {
      await this.addEvent({
        id: `event_${Date.now()}`,
        shipment_id: updatedIssue.shipment_id,
        type: 'issue_status_changed',
        at: updatedIssue.updated_at,
        by: 'current_user',
        payload: { 
          issue_id: id, 
          from_status: oldIssue.status, 
          to_status: patch.status 
        },
      });
    }
    
    return updatedIssue;
  },

  async listIssueComments(issueId: string): Promise<IssueComment[]> {
    await delay();
    
    const comments = getFromStorage<IssueComment[]>('issue_comments', seedIssueComments);
    return comments
      .filter(comment => comment.issue_id === issueId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async addIssueComment(issueId: string, body: string, authorId: string): Promise<IssueComment> {
    await delay();
    
    const comments = getFromStorage<IssueComment[]>('issue_comments', seedIssueComments);
    const now = new Date().toISOString();
    
    const newComment: IssueComment = {
      id: `comment_${Date.now()}`,
      issue_id: issueId,
      author_id: authorId,
      body,
      created_at: now,
    };
    
    comments.push(newComment);
    setToStorage('issue_comments', comments);
    
    // Update issue timestamp
    const issues = getFromStorage<Issue[]>('issues', seedIssues);
    const issue = issues.find(i => i.id === issueId);
    if (issue) {
      issue.updated_at = now;
      setToStorage('issues', issues);
      
      // Add event
      await this.addEvent({
        id: `event_${Date.now()}`,
        shipment_id: issue.shipment_id,
        type: 'issue_commented',
        at: now,
        by: authorId,
        payload: { issue_id: issueId },
      });
    }
    
    return newComment;
  },

  // Events API
  async listEvents(shipmentId: string): Promise<Event[]> {
    await delay();
    
    const events = getFromStorage<Event[]>('events', seedEvents);
    return events
      .filter(event => event.shipment_id === shipmentId)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  },

  async addEvent(event: Event): Promise<void> {
    await delay(50); // Shorter delay for events
    
    const events = getFromStorage<Event[]>('events', seedEvents);
    events.push(event);
    setToStorage('events', events);
  },

  // Cost Lines API
  async listCostLines(shipmentId: string): Promise<CostLine[]> {
    await delay();
    
    const costLines = getFromStorage<CostLine[]>('cost_lines', []);
    return costLines
      .filter(line => line.shipment_id === shipmentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createCostLine(input: Omit<CostLine, 'id' | 'created_at' | 'updated_at'>): Promise<CostLine> {
    await delay();
    
    const costLines = getFromStorage<CostLine[]>('cost_lines', []);
    const now = new Date().toISOString();
    
    const newCostLine: CostLine = {
      ...input,
      id: `cost_${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    
    costLines.push(newCostLine);
    setToStorage('cost_lines', costLines);
    
    // Add event
    await this.addEvent({
      id: `event_${Date.now()}`,
      shipment_id: newCostLine.shipment_id,
      type: 'costline_created',
      at: now,
      by: 'current_user',
      payload: { cost_line_id: newCostLine.id, label: newCostLine.label },
    });
    
    return newCostLine;
  },

  async updateCostLine(id: string, patch: Partial<Omit<CostLine, 'id' | 'created_at'>>): Promise<CostLine> {
    await delay();
    
    const costLines = getFromStorage<CostLine[]>('cost_lines', []);
    const index = costLines.findIndex(line => line.id === id);
    
    if (index === -1) {
      throw new Error('Cost line not found');
    }
    
    const updatedLine = {
      ...costLines[index],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    
    costLines[index] = updatedLine;
    setToStorage('cost_lines', costLines);
    
    // Add event
    await this.addEvent({
      id: `event_${Date.now()}`,
      shipment_id: updatedLine.shipment_id,
      type: 'costline_updated',
      at: updatedLine.updated_at,
      by: 'current_user',
      payload: { cost_line_id: id, label: updatedLine.label },
    });
    
    return updatedLine;
  },

  async deleteCostLine(id: string): Promise<void> {
    await delay();
    
    const costLines = getFromStorage<CostLine[]>('cost_lines', []);
    const line = costLines.find(l => l.id === id);
    
    if (!line) {
      throw new Error('Cost line not found');
    }
    
    const filtered = costLines.filter(l => l.id !== id);
    setToStorage('cost_lines', filtered);
    
    // Add event
    await this.addEvent({
      id: `event_${Date.now()}`,
      shipment_id: line.shipment_id,
      type: 'costline_deleted',
      at: new Date().toISOString(),
      by: 'current_user',
      payload: { cost_line_id: id, label: line.label },
    });
  },

  // Payments API
  async listPayments(shipmentId: string): Promise<Payment[]> {
    await delay();
    
    const payments = getFromStorage<Payment[]>('payments', []);
    return payments
      .filter(payment => payment.shipment_id === shipmentId)
      .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
  },

  async createPayment(input: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    await delay();
    
    const payments = getFromStorage<Payment[]>('payments', []);
    const now = new Date().toISOString();
    
    const newPayment: Payment = {
      ...input,
      id: `payment_${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    
    payments.push(newPayment);
    setToStorage('payments', payments);
    
    // Add event
    await this.addEvent({
      id: `event_${Date.now()}`,
      shipment_id: newPayment.shipment_id,
      type: 'payment_created',
      at: now,
      by: 'current_user',
      payload: { 
        payment_id: newPayment.id, 
        amount: newPayment.amount_fcfa,
        method: newPayment.method 
      },
    });
    
    return newPayment;
  },

  async deletePayment(id: string): Promise<void> {
    await delay();
    
    const payments = getFromStorage<Payment[]>('payments', []);
    const payment = payments.find(p => p.id === id);
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    const filtered = payments.filter(p => p.id !== id);
    setToStorage('payments', filtered);
    
    // Add event
    await this.addEvent({
      id: `event_${Date.now()}`,
      shipment_id: payment.shipment_id,
      type: 'payment_deleted',
      at: new Date().toISOString(),
      by: 'current_user',
      payload: { payment_id: id, amount: payment.amount_fcfa },
    });
  },

  // Cost Summary
  async getCostSummary(shipmentId: string): Promise<CostSummary> {
    await delay();
    
    const costLines = await this.listCostLines(shipmentId);
    const payments = await this.listPayments(shipmentId);
    
    const subtotal = costLines.reduce((sum, line) => sum + line.amount_fcfa, 0);
    const tax = costLines.reduce((sum, line) => {
      if (line.taxable) {
        return sum + (line.amount_fcfa * line.tax_rate_pct / 100);
      }
      return sum;
    }, 0);
    const total = subtotal + tax;
    const paid = payments.reduce((sum, payment) => sum + payment.amount_fcfa, 0);
    const balance = total - paid;
    
    return {
      subtotal_fcfa: subtotal,
      tax_fcfa: tax,
      total_fcfa: total,
      paid_fcfa: paid,
      balance_fcfa: balance,
    };
  },

  // Export CSV
  async exportCostsCsv(shipmentId: string): Promise<{ fileName: string; dataUrl: string }> {
    await delay();
    
    const costLines = await this.listCostLines(shipmentId);
    const csvData = costLines.map(line => ({
      'Type': line.type,
      'Label': line.label,
      'Amount (FCFA)': line.amount_fcfa,
      'Taxable': line.taxable ? 'Yes' : 'No',
      'Tax Rate (%)': line.tax_rate_pct,
      'Tax Amount (FCFA)': line.taxable ? (line.amount_fcfa * line.tax_rate_pct / 100) : 0,
      'Created': new Date(line.created_at).toLocaleDateString('en-GB'),
      'Updated': new Date(line.updated_at).toLocaleDateString('en-GB'),
    }));
    
    const csvContent = toCsv(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const dataUrl = URL.createObjectURL(blob);
    
    return {
      fileName: `costs_${shipmentId}_${new Date().toISOString().split('T')[0]}.csv`,
      dataUrl,
    };
  },
};