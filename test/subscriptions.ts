import * as chai from "chai";
import Stripe from "stripe";
import {buildStripeParityTest} from "./buildStripeParityTest";

describe("subscriptions", function () {

    this.timeout(30 * 1000);

    it("supports basic creation with no params", buildStripeParityTest(
        async (stripeClient) => {
            const plan = await stripeClient.plans.create({
                currency: "usd",
                interval: "month",
                amount: 1500,
                product: {
                    name: "subscription plan"
                }
            });

            const customer = await stripeClient.customers.create({
                source: "tok_visa"
            });

            const subscription = await stripeClient.subscriptions.create({
                customer: customer.id,
                items: [{
                    plan: plan.id,
                    quantity: 1
                }]
            });
            const subscriptionGet = await stripeClient.subscriptions.retrieve(subscription.id);

            chai.assert.equal(subscriptionGet.customer, customer.id);
            chai.assert.equal(
                subscriptionGet.id,
                subscriptionGet.items.data[0].subscription
            );

            return [subscription, subscriptionGet];
        }
    ));

    it("supports getting the subscriptionItem", buildStripeParityTest(
        async (stripeClient) => {
            const plan = await stripeClient.plans.create({
                currency: "usd",
                interval: "month",
                amount: 1500,
                product: {
                    name: "subscription plan"
                }
            });
            const customer = await stripeClient.customers.create({
                source: "tok_visa"
            });
            const subscription = await stripeClient.subscriptions.create({
                customer: customer.id,
                items: [{
                    plan: plan.id,
                    quantity: 1
                }]
            });

            const siGet = await stripeClient.subscriptionItems.retrieve(subscription.items.data[0].id);

            return [siGet];
        }
    ));

    it("supports updating the quantity", buildStripeParityTest(
        async (stripeClient) => {
            const plan = await stripeClient.plans.create({
                currency: "usd",
                interval: "month",
                amount: 1500,
                product: {
                    name: "subscription plan"
                }
            });
            const customer = await stripeClient.customers.create({
                source: "tok_visa"
            });
            const subscription = await stripeClient.subscriptions.create({
                customer: customer.id,
                items: [{
                    plan: plan.id,
                    quantity: 1
                }]
            });

            const si = subscription.items.data[0];
            const updated = await stripeClient.subscriptionItems.update(si.id, {
                quantity: 5
            });

            const subscriptionGet = await stripeClient.subscriptions.retrieve(subscription.id);
            chai.assert.equal(subscriptionGet.items.data[0].quantity, 5);

            return [updated, subscriptionGet];
        }
    ));

    it("supports fetching subscriptions from customer", buildStripeParityTest(
        async (stripeClient) => {
            const plan = await stripeClient.plans.create({
                currency: "usd",
                interval: "month",
                amount: 1500,
                product: {
                    name: "subscription plan"
                }
            });
            const customer = await stripeClient.customers.create({
                source: "tok_visa"
            });
            const subscription = await stripeClient.subscriptions
                .create({
                    customer: customer.id,
                    items: [{
                        plan: plan.id,
                        quantity: 2
                    }]
                });

            const customerGet = await stripeClient.customers.retrieve(customer.id, {expand: ["subscriptions"]}) as Stripe.Customer;
            chai.assert.lengthOf(customerGet.subscriptions.data, 1);
            chai.assert.equal(
                customerGet.subscriptions.data[0].id,
                subscription.id
            );

            return [customerGet];
        }
    ));
});
