"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";

export default function Lab() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-28 pb-20">
      <h1 className="mb-2 font-display text-4xl font-bold">UI Lab</h1>
      <p className="mb-12 text-mist">Primitivos del design system Stryd.</p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-mono text-xs tracking-widest text-stryd uppercase">Botones</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
            <Button size="sm">SM</Button>
            <Button size="lg">LG</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-mono text-xs tracking-widest text-stryd uppercase">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge tone="stryd">Aceptando</Badge>
            <Badge tone="success">Inscrito</Badge>
            <Badge tone="danger">Agotado</Badge>
            <Badge>Cerrada</Badge>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-mono text-xs tracking-widest text-stryd uppercase">Inputs</h2>
          <div className="flex flex-col gap-4">
            <Input label="Cédula" placeholder="0-00-0000" hint="Sin guiones también funciona" />
            <Input label="Correo" type="email" placeholder="tu@correo.com" error="El correo no es válido" />
          </div>
        </Card>

        <Card className="p-6" interactive>
          <h2 className="mb-4 font-mono text-xs tracking-widest text-stryd uppercase">Diálogo</h2>
          <Button onClick={() => setDialogOpen(true)}>Abrir diálogo</Button>
        </Card>
      </div>

      <h2 className="mt-14 mb-4 font-mono text-xs tracking-widest text-stryd uppercase">Tabla</h2>
      <Table>
        <THead>
          <tr>
            <Th>Dorsal</Th>
            <Th>Corredor</Th>
            <Th>Categoría</Th>
            <Th>Tiempo</Th>
          </tr>
        </THead>
        <TBody>
          {[
            ["142", "Ana Cortés", "F 30-39", "00:41:12"],
            ["87", "Luis Mendoza", "M 20-29", "00:36:48"],
            ["215", "María Barrantes", "F 40-49", "00:48:03"],
          ].map(([bib, name, cat, time]) => (
            <Tr key={bib}>
              <Td className="font-mono text-stryd">{bib}</Td>
              <Td className="text-snow">{name}</Td>
              <Td>{cat}</Td>
              <Td className="font-mono">{time}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Confirmar inscripción">
        <p className="mb-6 text-sm text-mist">
          Este es el patrón de modal de v2: backdrop blur, scale-in con spring, ESC para cerrar.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => setDialogOpen(false)}>Confirmar</Button>
        </div>
      </Dialog>
    </div>
  );
}
