"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeCheck, ArrowRight, Mail, Send, Twitter, Linkedin, Facebook, Instagram, Github } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

const FEATURES = [
  {
    id: "tab-1",
    number: 1,
    title: "Manage Inventory",
    description: "Real-time inventory tracking across all eBay channels and warehouses. Keep stock levels synchronized automatically.",
    image: "/hero/image.png",
  },
  {
    id: "tab-2",
    number: 2,
    title: "Track Orders & Shipping",
    description: "Unified order management from multiple eBay stores. Automate shipping labels and track deliveries in real-time.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
  },
  {
    id: "tab-3",
    number: 3,
    title: "Seller Analytics & Insights",
    description: "Monitor sales performance, customer feedback, and market trends. Generate detailed reports for data-driven decisions.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
  },
  {
    id: "tab-4",
    number: 4,
    title: "Business Growth Tools",
    description: "Optimize pricing strategies, manage listings efficiently, and scale your eBay business with advanced automation.",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
  },
];

const PRICING_PLANS = [
  {
    name: "Personal",
    description: "Perfect for solo entrepreneurs starting their eBay journey",
    price: "$9/month billed monthly",
    priceYearly: "$8/month billed yearly",
    features: [
      "Single user account",
      "Up to 5 eBay store monitors",
      "Real-time inventory sync",
      "Basic analytics dashboard",
      "Email support (24hr response)",
      "Standard API access"
    ],
    buttonText: "Start Free Trial",
    buttonVariant: "secondary",
    link: "/auth/signup"
  },
  {
    name: "Pro",
    description: "Built for growing teams ready to scale their eBay business",
    price: "$29/month billed monthly",
    priceYearly: "$24/month billed yearly",
    features: [
      "Up to 10 team members + 1 admin",
      "Unlimited eBay store monitors",
      "Automated order processing",
      "Priority email & chat support",
      "Custom integrations"
    ],
    buttonText: "Subscribe to Pro",
    buttonVariant: "default",
    popular: true,
    link: "/auth/signup"
  },
  {
    name: "Enterprise",
    description: "Tailored solutions for large-scale eBay operations",
    price: "Custom pricing",
    features: [
      "Unlimited team members",
      "Dedicated account manager",
      "Custom API rate limits",
      "Advanced security & compliance",
      "Custom feature development",
    ],
    buttonText: "Contact Sales",
    buttonVariant: "secondary",
    link: "/auth/signup"
  }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("tab-1");
  const [pricingInterval, setPricingInterval] = useState("monthly");

  return (
    <div className="bg-zinc-50 font-sans dark:bg-black">
      <section className="py-24 lg:py-32">
        <div className="container mx-auto">
          <div className="mb-20 max-w-4xl px-8 lg:px-0 mx-auto text-center flex flex-col items-center gap-6">
            <span data-slot="badge" className="inline-flex items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-semibold w-fit whitespace-nowrap shrink-0 gap-2 transition-all hover:border-primary/40 hover:bg-primary/10 text-primary">
              🚀 Grow Your eBay Business
            </span>
            <h1 className="mb-4 mt-2 text-balance text-4xl font-bold md:text-6xl lg:text-7xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent leading-tight">
              Streamline Your eBay Operations with Smart Business Management
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              All-in-one platform to manage inventory, orders, shipping, and analytics. Scale your eBay business faster and smarter.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link href="/auth/signup">
                <Button size="lg" className="text-base px-8 py-6 h-auto font-semibold">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button size="lg" variant="outline" className="text-base px-8 py-6 h-auto font-semibold">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
          <div>
            <div dir="ltr" data-orientation="horizontal">
              <div role="tablist" aria-orientation="horizontal" className="relative grid items-start gap-6 lg:grid-cols-4 outline-none" tabIndex="0" data-orientation="horizontal">
                <div className="bg-input absolute left-4 right-0 top-[30px] -z-10 hidden h-px lg:block"></div>
                {/* mobile view */}
                {FEATURES.map((feature, index) => (
                  <button
                    key={feature.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === feature.id}
                    aria-controls={`${feature.id}-content`}
                    id={`${feature.id}-trigger`}
                    onClick={() => setActiveTab(feature.id)}
                    data-state={activeTab === feature.id ? "active" : "inactive"}
                    className="group pointer-events-none lg:pointer-events-auto"
                    tabIndex={activeTab === feature.id ? 0 : -1}
                  >
                    <div className="hover:bg-muted flex gap-4 rounded-md px-8 py-4 text-left lg:block lg:px-4">
                      <div className="flex flex-col items-center lg:contents">
                        <span className="bg-background lg:group-data-[state=active]:bg-primary lg:group-data-[state=active]:text-background lg:group-data-[state=active]:ring-muted-foreground/40 flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-medium lg:group-data-[state=active]:ring">
                          {feature.number}
                        </span>
                        <span className="bg-input h-full w-px lg:hidden"></span>
                      </div>
                      <div>
                        <h3 className="mb-1 font-medium lg:mt-4">{feature.title}</h3>
                        <p className="text-sm">{feature.description}</p>
                      </div>
                    </div>
                    <div className="mt-6 block border px-6 lg:hidden">
                      <div className="aspect-video relative overflow-hidden rounded-md">
                        <Image
                          src={feature.image}
                          alt={feature.title}
                          fill
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-10 hidden rounded-xl border lg:block">
                {FEATURES.map((feature) => (
                  <div
                    key={feature.id}
                    data-state={activeTab === feature.id ? "active" : "inactive"}
                    role="tabpanel"
                    aria-labelledby={`${feature.id}-trigger`}
                    id={`${feature.id}-content`}
                    tabIndex="0"
                    className="aspect-video relative overflow-hidden rounded-xl"
                    hidden={activeTab !== feature.id}
                  >
                    <Image
                      alt={feature.title}
                      className="h-full w-full object-cover rounded-lg border shadow"
                      src={feature.image}
                      fill
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="flex flex-col gap-16 px-8 text-center">
          <div className="flex flex-col items-center justify-center gap-8">
            <h1 className="mb-0 text-balance font-medium text-5xl tracking-tighter">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-0 mb-0 max-w-2xl text-balance text-lg text-muted-foreground">
              Managing a business is hard enough, so why not make your life easier? Our pricing plans are simple, transparent and scale with you.
            </p>

            <Tabs value={pricingInterval} onValueChange={setPricingInterval} className="flex flex-col gap-2">
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">
                  Yearly
                  <Badge variant="secondary" className="ml-1.5">20% off</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-8 grid w-full max-w-4xl gap-4 lg:grid-cols-3">
              {PRICING_PLANS.map((plan, index) => (
                <Card
                  key={plan.name}
                  className={`relative w-full text-left ${plan.popular ? 'ring-2 ring-primary' : ''}`}
                >
                  {plan.popular && (
                    <Badge
                      variant="default"
                      className="-translate-x-1/2 -translate-y-1/2 absolute top-0 left-1/2 rounded-full"
                    >
                      Popular
                    </Badge>
                  )}

                  <CardHeader>
                    <CardTitle className="font-medium text-xl">{plan.name}</CardTitle>
                    <CardDescription>
                      <p>{plan.description}</p>
                      <span className="font-medium text-foreground">
                        {pricingInterval === "yearly" && plan.priceYearly ? plan.priceYearly : plan.price}
                      </span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="grid gap-2">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-muted-foreground text-sm">
                        <BadgeCheck className="h-4 w-4" />
                        {feature}
                      </div>
                    ))}
                  </CardContent>

                  <CardFooter>
                    <Link href={plan.link} className="w-full">
                    <Button variant={plan.buttonVariant} className="w-full">
                      {plan.buttonText}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="flex items-center justify-center bg-secondary/50 p-8 min-h-full rounded-lg">
        <div className="w-full">
          <section className="py-16">
            <div className="container mx-auto">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold lg:text-4xl">Let's Stay Connected</h2>
                <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                  Subscribe to our newsletter for updates, or reach out directly. We'd love to hear from you!
                </p>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Newsletter Card */}
                <Card className="p-6 lg:p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold">Subscribe to Newsletter</h3>
                  <p className="text-muted-foreground mb-6 text-sm">
                    Get the latest updates, articles, and resources delivered to your inbox weekly.
                  </p>
                  <form action="#" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newsletter-email" className="sr-only">Email Address</Label>
                      <Input id="newsletter-email" placeholder="Enter your email" type="email" className="h-11" />
                    </div>
                    <Button className="w-full gap-2">
                      <Send className="h-4 w-4" />
                      Subscribe
                    </Button>
                    <p className="text-muted-foreground text-xs">No spam. Unsubscribe anytime.</p>
                  </form>

                  <div className="mt-8 border-t pt-6">
                    <p className="mb-4 text-sm font-medium">Follow Us</p>
                    <div className="flex items-center gap-3">
                      <a href="#" aria-label="Twitter" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground">
                        <Twitter className="h-5 w-5" />
                      </a>
                      <a href="#" aria-label="LinkedIn" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground">
                        <Linkedin className="h-5 w-5" />
                      </a>
                      <a href="#" aria-label="Facebook" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground">
                        <Facebook className="h-5 w-5" />
                      </a>
                      <a href="#" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground">
                        <Instagram className="h-5 w-5" />
                      </a>
                      <a href="#" aria-label="GitHub" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground">
                        <Github className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                </Card>

                {/* Contact Form Card */}
                <Card className="p-6 lg:col-span-2 lg:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                      <Send className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Send a Message</h3>
                      <p className="text-muted-foreground text-sm">We typically respond within 24 hours</p>
                    </div>
                  </div>
                  <form action="#" className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name">Name</Label>
                        <Input id="contact-name" placeholder="Your full name" className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-email">Email</Label>
                        <Input id="contact-email" placeholder="your@email.com" type="email" className="h-11" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-subject">Subject</Label>
                      <Input id="contact-subject" placeholder="What is this regarding?" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-message">Message</Label>
                      <Textarea id="contact-message" placeholder="Your message here..." rows={6} className="resize-none" />
                    </div>
                    <Button className="gap-2">
                      <Send className="h-4 w-4" />
                      Send Message
                    </Button>
                  </form>
                </Card>
              </div>

              <div className="mt-12 grid grid-cols-1 gap-8 rounded-lg bg-muted p-8 md:grid-cols-3">
                <div className="text-center md:text-left">
                  <h4 className="mb-2 font-semibold">Email</h4>
                  <p className="text-muted-foreground text-sm">hello@company.com</p>
                </div>
                <div className="text-center md:text-left">
                  <h4 className="mb-2 font-semibold">Phone</h4>
                  <p className="text-muted-foreground text-sm">+1 (555) 123-4567</p>
                </div>
                <div className="text-center md:text-left">
                  <h4 className="mb-2 font-semibold">Office</h4>
                  <p className="text-muted-foreground text-sm">
                    123 Business St, Suite 100<br />
                    New York, NY 10001
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
