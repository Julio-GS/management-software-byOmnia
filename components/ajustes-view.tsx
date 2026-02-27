"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Settings,
  Store,
  Users,
  Bell,
  Printer,
  Shield,
  Plus,
  Save,
  UserPlus,
} from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "cajero" | "supervisor" | "repositor"
  active: boolean
  lastLogin: string
}

const initialUsers: User[] = [
  { id: "1", name: "Maria Garcia", email: "maria.garcia@omnia.com", role: "cajero", active: true, lastLogin: "21/02/2026 08:15" },
  { id: "2", name: "Carlos Lopez", email: "carlos.lopez@omnia.com", role: "cajero", active: true, lastLogin: "21/02/2026 14:30" },
  { id: "3", name: "Ana Rodriguez", email: "ana.rodriguez@omnia.com", role: "supervisor", active: true, lastLogin: "21/02/2026 07:45" },
  { id: "4", name: "Pedro Martinez", email: "pedro.martinez@omnia.com", role: "cajero", active: true, lastLogin: "20/02/2026 22:10" },
  { id: "5", name: "Laura Fernandez", email: "laura.fernandez@omnia.com", role: "admin", active: true, lastLogin: "21/02/2026 09:00" },
  { id: "6", name: "Diego Sanchez", email: "diego.sanchez@omnia.com", role: "repositor", active: false, lastLogin: "15/02/2026 10:20" },
]

const roleLabels: Record<User["role"], string> = {
  admin: "Administrador",
  cajero: "Cajero/a",
  supervisor: "Supervisor/a",
  repositor: "Repositor/a",
}

const roleBadgeStyles: Record<User["role"], string> = {
  admin: "border-primary/30 bg-primary/10 text-primary",
  cajero: "border-chart-2/30 bg-chart-2/10 text-chart-2",
  supervisor: "border-warning/30 bg-warning/10 text-warning-foreground",
  repositor: "border-chart-3/30 bg-chart-3/10 text-chart-3",
}

export function AjustesView() {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [showNewUserDialog, setShowNewUserDialog] = useState(false)
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "cajero" as User["role"] })

  // Store settings state
  const [storeName, setStoreName] = useState("Omnia Build Supermercado")
  const [storeCuit, setStoreCuit] = useState("30-71234567-9")
  const [storeAddress, setStoreAddress] = useState("Av. Corrientes 1234, CABA")
  const [storePhone, setStorePhone] = useState("011-4567-8900")
  const [taxRate, setTaxRate] = useState("21")

  // Notification settings
  const [lowStockAlert, setLowStockAlert] = useState(true)
  const [expiryAlert, setExpiryAlert] = useState(true)
  const [dailySummary, setDailySummary] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [expiryDays, setExpiryDays] = useState("7")

  // Printer settings
  const [printerModel, setPrinterModel] = useState("Epson TM-T20II")
  const [autoprint, setAutoprint] = useState(true)
  const [printCopy, setPrintCopy] = useState(false)

  function toggleUser(id: string) {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u))
    )
  }

  function createUser() {
    const user: User = {
      id: Date.now().toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      active: true,
      lastLogin: "Nunca",
    }
    setUsers((prev) => [...prev, user])
    setShowNewUserDialog(false)
    setNewUser({ name: "", email: "", role: "cajero" })
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Ajustes del Sistema</h2>
      </div>

      <Tabs defaultValue="store" className="flex-1">
        <TabsList>
          <TabsTrigger value="store" className="gap-1.5">
            <Store className="h-3.5 w-3.5" />
            Sucursal
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="printer" className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Impresora
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                <Store className="h-[18px] w-[18px]" />
                Datos de la Sucursal
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-card-foreground">Nombre del Comercio</label>
                  <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="bg-background border-input" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-card-foreground">CUIT</label>
                  <Input value={storeCuit} onChange={(e) => setStoreCuit(e.target.value)} className="bg-background border-input font-mono" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-card-foreground">Direccion</label>
                  <Input value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} className="bg-background border-input" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-card-foreground">Telefono</label>
                  <Input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} className="bg-background border-input font-mono" />
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-card-foreground">Configuracion Fiscal</h3>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-card-foreground">Tasa IVA (%)</label>
                    <Input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="bg-background border-input font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-card-foreground">Punto de Venta AFIP</label>
                    <Input value="0001" readOnly className="bg-muted border-input font-mono text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-card-foreground">Condicion IVA</label>
                    <Select defaultValue="ri">
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ri">Responsable Inscripto</SelectItem>
                        <SelectItem value="mono">Monotributista</SelectItem>
                        <SelectItem value="exento">Exento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button className="gap-2 bg-primary text-primary-foreground">
                  <Save className="h-3.5 w-3.5" />
                  Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                  <Shield className="h-[18px] w-[18px]" />
                  Usuarios y Permisos
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowNewUserDialog(true)}
                  className="h-9 gap-2 bg-primary text-primary-foreground"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Nuevo Usuario
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Gestiona los usuarios del sistema. Los roles y permisos detallados se configuran proximamente.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Usuario
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Rol
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ultimo Acceso
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Estado
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground pr-6">
                      Activo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-border">
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-card-foreground">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${roleBadgeStyles[user.role]} text-[11px]`} variant="outline">
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{user.lastLogin}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.active ? (
                          <Badge className="border-success/30 bg-success/10 text-success-foreground text-[11px]" variant="outline">
                            Activo
                          </Badge>
                        ) : (
                          <Badge className="border-border bg-muted text-muted-foreground text-[11px]" variant="outline">
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        <Switch
                          checked={user.active}
                          onCheckedChange={() => toggleUser(user.id)}
                          aria-label={`Activar/desactivar ${user.name}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                <Bell className="h-[18px] w-[18px]" />
                Configuracion de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center justify-between rounded-lg border border-border bg-background px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">Alerta de Stock Bajo</span>
                  <span className="text-xs text-muted-foreground">Notificar cuando un producto baje del stock minimo</span>
                </div>
                <Switch checked={lowStockAlert} onCheckedChange={setLowStockAlert} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">Alerta de Vencimientos</span>
                  <span className="text-xs text-muted-foreground">Notificar productos proximos a vencer</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(e.target.value)}
                      className="h-8 w-16 bg-card border-input font-mono text-sm text-center"
                    />
                    <span className="text-xs text-muted-foreground">dias antes</span>
                  </div>
                  <Switch checked={expiryAlert} onCheckedChange={setExpiryAlert} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">Resumen Diario por Email</span>
                  <span className="text-xs text-muted-foreground">Recibir un resumen de ventas al cierre del dia</span>
                </div>
                <Switch checked={dailySummary} onCheckedChange={setDailySummary} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">Sonido de Alertas</span>
                  <span className="text-xs text-muted-foreground">Emitir sonido cuando se genere una alerta critica</span>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>

              <div className="flex justify-end pt-2">
                <Button className="gap-2 bg-primary text-primary-foreground">
                  <Save className="h-3.5 w-3.5" />
                  Guardar Alertas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Printer Tab */}
        <TabsContent value="printer">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                <Printer className="h-[18px] w-[18px]" />
                Impresora Fiscal
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-card-foreground">Modelo de Impresora</label>
                  <Select value={printerModel} onValueChange={setPrinterModel}>
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Epson TM-T20II">Epson TM-T20II</SelectItem>
                      <SelectItem value="Hasar SMH/PT-250F">Hasar SMH/PT-250F</SelectItem>
                      <SelectItem value="Epson TM-T900FA">Epson TM-T900FA</SelectItem>
                      <SelectItem value="Sam4s Ellix40">Sam4s Ellix 40</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-card-foreground">Puerto</label>
                  <Input value="USB001" readOnly className="bg-muted border-input font-mono text-muted-foreground" />
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="flex items-center justify-between rounded-lg border border-border bg-background px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">Impresion Automatica</span>
                  <span className="text-xs text-muted-foreground">Imprimir ticket automaticamente al emitir factura</span>
                </div>
                <Switch checked={autoprint} onCheckedChange={setAutoprint} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">Duplicado de Ticket</span>
                  <span className="text-xs text-muted-foreground">Imprimir una copia adicional del ticket</span>
                </div>
                <Switch checked={printCopy} onCheckedChange={setPrintCopy} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" className="gap-2 border-border text-card-foreground">
                  <Printer className="h-3.5 w-3.5" />
                  Test de Impresion
                </Button>
                <Button className="gap-2 bg-primary text-primary-foreground">
                  <Save className="h-3.5 w-3.5" />
                  Guardar Configuracion
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New User Dialog */}
      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-card-foreground">
              <UserPlus className="h-4 w-4" />
              Nuevo Usuario
            </DialogTitle>
            <DialogDescription>
              Agrega un nuevo usuario al sistema. Los permisos se asignan segun el rol.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-card-foreground">Nombre Completo</label>
              <Input
                placeholder="Ej: Juan Perez"
                value={newUser.name}
                onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                className="bg-background border-input"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-card-foreground">Email</label>
              <Input
                type="email"
                placeholder="Ej: juan.perez@omnia.com"
                value={newUser.email}
                onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                className="bg-background border-input"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-card-foreground">Rol</label>
              <Select
                value={newUser.role}
                onValueChange={(v) => setNewUser((u) => ({ ...u, role: v as User["role"] }))}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cajero">Cajero/a</SelectItem>
                  <SelectItem value="supervisor">Supervisor/a</SelectItem>
                  <SelectItem value="repositor">Repositor/a</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewUserDialog(false)}
              className="border-border text-card-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={createUser}
              disabled={!newUser.name || !newUser.email}
              className="gap-2 bg-primary text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
