
"use client";

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Product } from '@/types';
import Image from 'next/image';

const productSchema = z.object({
  brand: z.string().min(2, { message: "Brand must be at least 2 characters." }),
  model: z.string().min(2, { message: "Model must be at least 2 characters." }),
  capacity: z.string().min(2, { message: "Capacity is required (e.g., 1.5 Ton)." }),
  price: z.coerce.number().positive({ message: "Price must be a positive number." }),
  stock: z.coerce.number().int().min(0, { message: "Stock must be a non-negative integer." }),
  condition: z.enum(['New', 'Used'], { required_error: 'Condition is required.' }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }).max(1000, {message: "Description cannot exceed 1000 characters."}),
  category: z.string().min(3, { message: "Category must be at least 3 characters." }),
  imageUrls: z.array(z.string().url({ message: "Please enter a valid URL." })).optional(),
  features: z.string().optional(),
  warranty: z.string().optional(),
  discountPercentage: z.coerce.number().int().min(0).max(99).optional().or(z.literal('')),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSaved: () => void;
  productToEdit?: Product | null;
}

export function ProductFormModal({
  isOpen,
  onClose,
  onProductSaved,
  productToEdit,
}: ProductFormModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      brand: '', model: '', capacity: '', price: 0, stock: 1,
      condition: 'Used', description: '', category: '', imageUrls: [],
      features: '', warranty: '', discountPercentage: undefined,
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "imageUrls",
  });

  const imageUrls = form.watch("imageUrls");

  useEffect(() => {
    if (productToEdit) {
      form.reset({ ...productToEdit, features: productToEdit.features || '', warranty: productToEdit.warranty || '', imageUrls: productToEdit.imageUrls || [], discountPercentage: productToEdit.discountPercentage || undefined });
    } else {
      form.reset({
        brand: '', model: '', capacity: '', price: 0, stock: 1,
        condition: 'Used', description: '', category: '', imageUrls: [],
        features: '', warranty: '', discountPercentage: undefined,
      });
    }
    setFilesToUpload([]);
  }, [productToEdit, form, isOpen]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFilesToUpload(Array.from(event.target.files));
    }
  };
  
  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    
    let finalImageUrls = data.imageUrls || [];

    // Step 1: Upload all new files to Supabase if any exist
    if (filesToUpload.length > 0) {
      toast({ title: 'Uploading Images...', description: `Uploading ${filesToUpload.length} image(s).` });
      const uploadPromises = filesToUpload.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.error || `Failed to upload ${file.name}`);
          }
          return result.path;
        } catch (uploadError) {
          console.error(`Upload error for ${file.name}:`, uploadError);
          toast({
            title: `Upload Failed for ${file.name}`,
            description: (uploadError as Error).message,
            variant: 'destructive',
          });
          return null;
        }
      });

      const uploadedUrlResults = await Promise.all(uploadPromises);
      const successfulUploads = uploadedUrlResults.filter((url): url is string => url !== null);

      if (successfulUploads.length !== filesToUpload.length) {
        toast({ title: 'Upload Incomplete', description: 'Some images failed to upload. Please try again.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }
      finalImageUrls.push(...successfulUploads);
    }
    
    // Step 2: Save product data to Firestore with all image URLs
    try {
      const productData = { 
        ...data,
        imageUrls: finalImageUrls.length > 0 ? finalImageUrls : ['https://placehold.co/600x400.png'], // Add placeholder if no images
        discountPercentage: data.discountPercentage ? Number(data.discountPercentage) : null,
        updatedAt: serverTimestamp(),
      };

      if (productToEdit) {
        const productRef = doc(db, 'products', productToEdit.id);
        await setDoc(productRef, productData, { merge: true });
        toast({ title: 'Product Updated', description: `${data.brand} ${data.model} has been updated.` });
      } else {
        await addDoc(collection(db, 'products'), { ...productData, createdAt: serverTimestamp() });
        toast({ title: 'Product Added', description: `${data.brand} ${data.model} has been added.` });
      }
      onProductSaved(); // This is a callback, for example, to refresh a product list
      onClose(); // This closes the modal
    } catch (error) {
      console.error('Error saving product to Firestore:', error);
      toast({
        title: 'Firestore Error',
        description: `Could not save product. ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filePreviews = filesToUpload.map(file => URL.createObjectURL(file));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90svh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{productToEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>{productToEdit ? 'Update the details of this AC unit.' : 'Enter the details for the new AC unit.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="brand" render={({ field }) => ( <FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., LG, Samsung, Voltas" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., X2000, CoolPro 150" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input placeholder="e.g., 1.5 Ton, 18000 BTU" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., Split AC, Window AC" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField control={form.control} name="price" render={({ field }) => ( <FormItem><FormLabel>Price (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 25000" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="stock" render={({ field }) => ( <FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="condition" render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="Used">Used</SelectItem></SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="discountPercentage"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Discount (%)</FormLabel>
                    <FormControl>
                        <Input
                            type="number"
                            placeholder="e.g., 10"
                            {...field}
                            onChange={event => field.onChange(event.target.value === '' ? '' : parseInt(event.target.value, 10))}
                            value={field.value ?? ''}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Detailed product description..." {...field} rows={5} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="warranty" render={({ field }) => ( <FormItem><FormLabel>Warranty (Optional)</FormLabel><FormControl><Input placeholder="e.g., 1 Year Parts, 5 Years Compressor" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="features" render={({ field }) => ( <FormItem><FormLabel>Features (Optional)</FormLabel><FormControl><Textarea placeholder="Comma-separated features..." {...field} rows={3} /></FormControl><ShadFormDescription>Enter key features separated by commas.</ShadFormDescription><FormMessage /></FormItem> )} />
            
            <FormItem>
              <FormLabel>Product Images</FormLabel>
              <div className="p-4 border rounded-md">
                 <div className="flex items-center gap-2">
                    <Input 
                      id="file-upload"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleFileChange}
                      multiple
                      className="flex-grow"
                    />
                  </div>
                  <ShadFormDescription className="mt-2">Select one or more new images to upload when the product is saved.</ShadFormDescription>
                
                <FormField
                    control={form.control}
                    name="imageUrls"
                    render={() => (
                        <FormItem className="mt-4">
                            {(imageUrls && imageUrls.length > 0) || filePreviews.length > 0 ? (
                                <>
                                    <FormLabel className="text-sm font-medium">Image Previews</FormLabel>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="relative group">
                                                <Image
                                                    src={imageUrls?.[index] || 'https://placehold.co/150x150.png'}
                                                    alt={`Product image ${index + 1}`}
                                                    width={150}
                                                    height={150}
                                                    className="rounded-md object-cover aspect-square border"
                                                />
                                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => remove(index)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {filePreviews.map((previewUrl, index) => (
                                          <div key={previewUrl} className="relative group">
                                            <Image src={previewUrl} alt={`New file preview ${index + 1}`} width={150} height={150} className="rounded-md object-cover aspect-square border" />
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white text-xs font-bold rounded-md">Pending Upload</div>
                                          </div>
                                        ))}
                                    </div>
                                </>
                            ) : null}
                            <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
            </FormItem>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {productToEdit ? 'Save Changes' : 'Add Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
