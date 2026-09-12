import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RiSearchLine } from "@remixicon/react";
import { fetchProducts, fetchCheckouts } from "@/services/products";
import type { ProductAPI, CheckoutAPI } from "@/types/product";
import { CheckoutOption } from "./CheckoutOption";

interface DefineCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  currentCheckoutId?: string;
  onSave: (referenceId: string, referenceLabel: string) => Promise<void>;
  /** Chamado ao salvar com dados do produto selecionado */
  onProductResolved?: (productId: string, productName: string) => void;
}

export function DefineCheckoutModal({
  open, onOpenChange, campaignName,
  currentCheckoutId, onSave, onProductResolved,
}: DefineCheckoutModalProps) {
  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [checkouts, setCheckouts] = useState<CheckoutAPI[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!selectedProductId) {
      setCheckouts([]);
      return;
    }
    setLoading(true);
    fetchCheckouts(Number(selectedProductId))
      .then(setCheckouts)
      .finally(() => setLoading(false));
  }, [selectedProductId]);

  useEffect(() => {
    if (open && currentCheckoutId) setSelectedId(currentCheckoutId);
    else setSelectedId("");
  }, [open, currentCheckoutId]);

  const filtered = useMemo(() => {
    if (!search) return checkouts;
    const q = search.toLowerCase();
    return checkouts.filter((c) =>
      (c.name?.toLowerCase().includes(q)) ||
      c.url.toLowerCase().includes(q),
    );
  }, [checkouts, search]);

  const selectedProduct = products.find(
    (p) => String(p.id) === selectedProductId,
  );

  const handleSave = async () => {
    if (!selectedId) return;
    const checkout = checkouts.find((c) => String(c.id) === selectedId);
    if (!checkout || !selectedProduct) return;

    setSaving(true);
    const label = checkout.name
      ? `${selectedProduct.name} → ${checkout.name}`
      : `${selectedProduct.name} → ${checkout.url}`;
    await onSave(String(checkout.id), label);

    if (onProductResolved) {
      onProductResolved(String(selectedProduct.id), selectedProduct.name);
    }

    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Definir Checkout</DialogTitle>
          <DialogDescription className="truncate">
            {campaignName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Produto</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProductId && (
            <>
              <div className="relative">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar checkout..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  autoComplete="off"
                />
              </div>

              <div className="max-h-[200px] overflow-y-auto overflow-x-hidden space-y-1 border rounded-md p-2">
                {loading ? (
                  <p className="text-sm text-muted-foreground p-2">Carregando...</p>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">Nenhum checkout encontrado</p>
                ) : (
                  filtered.map((c) => (
                    <CheckoutOption
                      key={c.id}
                      checkout={c}
                      isSelected={String(c.id) === selectedId}
                      onSelect={() => setSelectedId(String(c.id))}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!selectedId || saving}>
            {saving ? "Salvando..." : "Definir Checkout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
