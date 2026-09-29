import axios from "axios";

const BASE = "http://localhost:8000";

class MobileAPI {
  private token: string | null = null;
  client = axios.create({ baseURL: `${BASE}/api/v1` });

  constructor() {
    this.client.interceptors.request.use((config) => {
      if (this.token) config.headers.Authorization = `Bearer ${this.token}`;
      return config;
    });
  }

  setToken(t: string | null) { this.token = t; }

  // Auth
  async login(login_name: string, password: string) { const r = await this.client.post("/auth/login", { login_name, password }); this.token = r.data.access_token; return r.data; }

  // Jobs
  async listJobs(params?: any) { return (await this.client.get("/jobs", { params })).data; }

  // Visits
  async listVisits(params?: any) { return (await this.client.get("/visits", { params })).data; }
  async getVisit(id: string) { return (await this.client.get(`/visits/${id}`)).data; }
  async acceptVisit(id: string) { return (await this.client.patch(`/visits/${id}/accept`)).data; }
  async submitVisit(id: string, d: any) { return (await this.client.patch(`/visits/${id}/submit`, d)).data; }
  async addExpense(id: string, d: any) { return (await this.client.post(`/visits/${id}/expenses`, d)).data; }
  async addPhoto(id: string, d: any) { return (await this.client.post(`/visits/${id}/photos`, d)).data; }
  async addFinding(id: string, d: any) { return (await this.client.post(`/visits/${id}/findings`, d)).data; }
  async qualityCheck(id: string, d: any) { return (await this.client.patch(`/visits/${id}/quality-check`, d)).data; }

  // AI
  async generateReport(visitId: string) { return (await this.client.post(`/ai/generate-report/${visitId}`)).data; }
  async detectAnomalies(visitId: string) { return (await this.client.get(`/ai/detect-anomalies/${visitId}`)).data; }

  // Dashboard
  async getStats() { return (await this.client.get("/dashboard/stats")).data; }
}

export const api = new MobileAPI();
export default api;
