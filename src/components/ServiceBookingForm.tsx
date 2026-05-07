
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription as ShadFormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Home, Briefcase, MapPin } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Service, Address } from "@/types";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDoc, query, onSnapshot, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";

const serviceBookingSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number format. Include country code if necessary (e.g., +91XXXXXXXXXX)." }),
  email: z.string().email({ message: "Invalid email address." }),
  serviceType: z.string({ required_error: "Please select a service type." }),
  bookingDate: z.date({ required_error: "A date for booking is required." }),
  bookingTime: z.string({ required_error: "Please select a time slot." }),
  paymentAmount: z.coerce.number().min(1, { message: "Amount must be at least ₹1." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters."}),
});

type ServiceBookingFormValues = z.infer<typeof serviceBookingSchema>;

const timeSlots = [
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
];

interface ServiceBookingFormProps {
  availableServices: Service[];
  initialServiceType?: string;
}

export function ServiceBookingForm({ availableServices, initialServiceType }: ServiceBookingFormProps) {
  const { isLoggedIn, openAuthModal, currentUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const [userAddresses, setUserAddresses] = useState<Address[]>([]);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');

  const form = useForm<ServiceBookingFormValues>({
    resolver: zodResolver(serviceBookingSchema),
    defaultValues: {
      name: currentUser?.displayName || "",
      phone: "", 
      email: currentUser?.email || "",
      serviceType: initialServiceType || "",
      paymentAmount: undefined,
      address: "",
    },
  });

  const watchedServiceType = form.watch("serviceType");

  const paymentAmountPlaceholder = useMemo(() => {
    if (!watchedServiceType) {
      return "e.g., 500";
    }
    const selectedService = availableServices.find(s => s.name === watchedServiceType);
    if (selectedService) {
        if (selectedService.minPrice) return `${selectedService.minPrice}`;
        if (selectedService.price) return `${selectedService.price}`;
    }
    return "e.g., 500";
  }, [watchedServiceType, availableServices]);
  
  useEffect(() => {
    const selectedService = availableServices.find(s => s.name === watchedServiceType);
    if (selectedService) {
        if (selectedService.minPrice) {
            form.setValue("paymentAmount", selectedService.minPrice);
        } else if (selectedService.price) {
            form.setValue("paymentAmount", selectedService.price);
        }
    }
  }, [watchedServiceType, availableServices, form]);


  useEffect(() => {
    if (currentUser) {
      setIsLoadingUserDetails(true);
      const fetchUserDetails = async () => {
        try {
          // Fetch user document for phone number
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            form.reset({
              ...form.getValues(),
              name: userData.displayName || currentUser.displayName || "",
              email: userData.email || currentUser.email || "",
              phone: userData.phone || ""
            })
          }

          // Fetch user addresses
          const addressesColRef = collection(db, "users", currentUser.uid, "addresses");
          const addressesQuery = query(addressesColRef);
          const unsubscribe = onSnapshot(addressesQuery, (snapshot) => {
            const fetchedAddresses: Address[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Address));
            setUserAddresses(fetchedAddresses);
            const defaultAddress = fetchedAddresses.find(a => a.isDefault);
            if (defaultAddress) {
              setSelectedAddressId(defaultAddress.id);
              const fullAddress = `${defaultAddress.line1}${defaultAddress.line2 ? ', ' + defaultAddress.line2 : ''}, ${defaultAddress.city}, ${defaultAddress.state} ${defaultAddress.zipCode}`;
              form.setValue('address', fullAddress);
            } else {
              setSelectedAddressId('new');
              form.setValue('address', '');
            }
          });
          // Note: This onSnapshot listener will remain active for the component's lifetime.
        } catch (error) {
          console.error("Error fetching user details for form", error);
          toast({ title: "Error", description: "Could not load your saved details.", variant: "destructive" });
        } finally {
          setIsLoadingUserDetails(false);
        }
      };
      fetchUserDetails();
    } else {
       form.reset({
        name: "",
        phone: "", 
        email: "",
        serviceType: initialServiceType || "",
        paymentAmount: undefined,
        address: "",
      });
    }
  }, [currentUser, form, toast, initialServiceType]);
  
  useEffect(() => {
    if (initialServiceType) {
      form.setValue("serviceType", initialServiceType, { shouldValidate: true });
    }
  }, [initialServiceType, form]);


  async function onSubmit(data: ServiceBookingFormValues) {
    if (!isLoggedIn || !currentUser) {
      toast({
        title: "Login Required",
        description: "Please login or register to book an appointment.",
        variant: "destructive",
      });
      openAuthModal();
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "users", currentUser.uid, "appointments"), {
        userId: currentUser.uid,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        serviceType: data.serviceType,
        bookingDate: format(data.bookingDate, "yyyy-MM-dd"), // Store date as string
        bookingTime: data.bookingTime,
        paymentAmount: data.paymentAmount,
        status: "Payment Pending", // Initial status
        createdAt: serverTimestamp(), // For ordering
      });

      toast({
        title: "Booking Request Submitted!",
        description: `We've received your request. You'll now be redirected to your account page to complete payment.`,
      });

      router.push('/my-account');

      form.reset({ 
        name: currentUser?.displayName || "",
        phone: "",
        email: currentUser?.email || "",
        serviceType: "", 
        bookingDate: undefined,
        bookingTime: undefined,
        paymentAmount: undefined,
        address: "",
      });
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast({ title: "Booking Error", description: "Could not submit your booking request. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getAddressIcon = (type: Address['type']) => {
    switch (type) {
      case 'Home': return <Home className="w-4 h-4 text-primary mr-2 shrink-0" />;
      case 'Work': return <Briefcase className="w-4 h-4 text-primary mr-2 shrink-0" />;
      default: return <MapPin className="w-4 h-4 text-primary mr-2 shrink-0" />;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} disabled={isSubmitting || isLoadingUserDetails} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+911234567890" {...field} disabled={isSubmitting || isLoadingUserDetails} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} disabled={isSubmitting || isLoadingUserDetails} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Service Address</FormLabel>
              {isLoadingUserDetails && isLoggedIn && <div><Loader2 className="h-4 w-4 animate-spin"/></div>}
              {!isLoadingUserDetails && isLoggedIn && (
                <RadioGroup
                  onValueChange={(value) => {
                    setSelectedAddressId(value);
                    if (value === 'new') {
                      field.onChange('');
                    } else {
                      const selected = userAddresses.find(a => a.id === value);
                      if (selected) {
                        const fullAddress = `${selected.line1}${selected.line2 ? ', ' + selected.line2 : ''}, ${selected.city}, ${selected.state} ${selected.zipCode}`;
                        field.onChange(fullAddress);
                      }
                    }
                  }}
                  value={selectedAddressId}
                  className="space-y-2"
                >
                  {userAddresses.map((addr) => (
                    <FormItem key={addr.id} className="flex items-center space-x-3 space-y-0 p-3 border rounded-md has-[:checked]:border-primary">
                      <FormControl><RadioGroupItem value={addr.id} /></FormControl>
                      <Label htmlFor={addr.id} className="font-normal flex-grow cursor-pointer">
                        <div className="flex items-center font-semibold mb-1">
                          {getAddressIcon(addr.type)} {addr.type}
                          {addr.isDefault && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Default</span>}
                        </div>
                         <address className="not-italic text-sm text-muted-foreground">{addr.line1}, {addr.city}</address>
                      </Label>
                    </FormItem>
                  ))}
                  <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md has-[:checked]:border-primary">
                    <FormControl><RadioGroupItem value="new" /></FormControl>
                    <Label className="font-normal flex-grow cursor-pointer">Use a new/different address</Label>
                  </FormItem>
                </RadioGroup>
              )}

              {(selectedAddressId === 'new' || !isLoggedIn) && (
                <FormControl>
                  <Input
                    placeholder="e.g., A-123, Rose Villa, MG Road, Mumbai"
                    {...field}
                    disabled={isSubmitting}
                    className="mt-2"
                  />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableServices.map(service => (
                      <SelectItem key={service.id} value={service.name}>{service.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Amount (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={paymentAmountPlaceholder}
                    {...field}
                    value={field.value ?? ''}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <ShadFormDescription>
                  This is the initial payment for the service.
                </ShadFormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="bookingDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) } 
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bookingTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Time Slot</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a time slot" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timeSlots.map(slot => (
                       <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" size="lg" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? 'Submitting...' : 'Request Appointment'}
        </Button>
      </form>
    </Form>
  );
}
