
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription as ShadFormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Service } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const serviceSchema = z.object({
  name: z.string().min(3, { message: "Service name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  category: z.string().min(3, { message: "Category must be at least 3 characters." }),
  status: z.enum(['Active', 'Inactive'], { required_error: 'Status is required.'}),
  price: z.coerce.number().positive({ message: "Price must be a positive number." }).optional().or(z.literal('')),
  minPrice: z.coerce.number().positive({ message: "Min price must be a positive number." }).optional().or(z.literal('')),
  maxPrice: z.coerce.number().positive({ message: "Max price must be a positive number." }).optional().or(z.literal('')),
  duration: z.string().optional(),
  icon: z.string().min(2, { message: "An icon name from lucide-react is required." }),
}).refine(data => {
    if (data.minPrice && data.maxPrice) {
        return Number(data.maxPrice) >= Number(data.minPrice);
    }
    return true;
}, {
    message: "Max price must be greater than or equal to min price",
    path: ["maxPrice"]
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceSaved: () => void;
  serviceToEdit?: Service | null;
}

export function ServiceFormModal({
  isOpen,
  onClose,
  onServiceSaved,
  serviceToEdit,
}: ServiceFormModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      status: 'Active',
      price: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      duration: '',
      icon: 'Wrench',
    },
  });

  useEffect(() => {
    if (serviceToEdit) {
      form.reset({
        name: serviceToEdit.name || '',
        description: serviceToEdit.description || '',
        category: serviceToEdit.category || '',
        status: serviceToEdit.status || 'Active',
        price: serviceToEdit.price || undefined,
        minPrice: serviceToEdit.minPrice || undefined,
        maxPrice: serviceToEdit.maxPrice || undefined,
        duration: serviceToEdit.duration || '',
        icon: serviceToEdit.icon || 'Wrench',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        category: '',
        status: 'Active',
        price: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        duration: '',
        icon: 'Wrench',
      });
    }
  }, [serviceToEdit, form, isOpen]);

  const onSubmit = async (data: ServiceFormValues) => {
    setIsSubmitting(true);
    try {
      const serviceData = {
        ...data,
        price: data.price ? Number(data.price) : null,
        minPrice: data.minPrice ? Number(data.minPrice) : null,
        maxPrice: data.maxPrice ? Number(data.maxPrice) : null,
        duration: data.duration || null,
        updatedAt: serverTimestamp(),
      };

      if (serviceToEdit) {
        const serviceRef = doc(db, 'services', serviceToEdit.id);
        await setDoc(serviceRef, serviceData, { merge: true });
        toast({ title: 'Service Updated', description: `${data.name} has been updated.` });
      } else {
        await addDoc(collection(db, 'services'), {
          ...serviceData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Service Added', description: `${data.name} has been added.` });
      }
      onServiceSaved();
      onClose();
    } catch (error) {
      console.error('Error saving service:', error);
      toast({
        title: 'Error',
        description: `Could not save service. Please check permissions. ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90svh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{serviceToEdit ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          <DialogDescription>
            {serviceToEdit ? 'Update the details of this service.' : 'Enter the details for the new service.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Service Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Dry Service" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl><Input placeholder="e.g., Cleaning, Repair, Installation" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Detailed service description..." {...field} rows={4} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border p-4 rounded-lg bg-muted/20">
               <div className="lg:col-span-3 mb-2">
                 <h4 className="text-sm font-semibold">Pricing Configuration</h4>
                 <p className="text-xs text-muted-foreground">Set a fixed price or a price range.</p>
               </div>
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fixed Price (₹)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 500" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Price (₹)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 500" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Price (₹)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 800" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., 60 mins, 2 hours" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Wrench" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {serviceToEdit ? 'Save Changes' : 'Add Service'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
