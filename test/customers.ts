import * as chai from "chai";
import Stripe from "stripe";
import {generateId} from "../src/api/utils";
import {buildStripeParityTest} from "./buildStripeParityTest";
import {getLocalStripeClient} from "./stripeUtils";

describe("customers", () => {

    const localStripeClient = getLocalStripeClient();

    it("supports basic creation with no params", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({});
            const customerGet = await stripeClient.customers.retrieve(customer.id);
            const customerGetExpanded = await stripeClient.customers.retrieve(customer.id, {expand: ["sources", "subscriptions"]});
            return [customer, customerGet, customerGetExpanded];
        }
    ));

    it("supports creating with a specific ID", buildStripeParityTest(
        async (stripeClient) => {
            // This isn't documented anywhere but it does work.
            const id = `cus_${generateId()}`;
            const customer = await stripeClient.customers.create({id} as any);
            chai.assert.equal(customer.id, id);
            const customerGet = await stripeClient.customers.retrieve(customer.id);
            chai.assert.equal(customerGet.id, id);
            return [customer];
        }
    ));

    it("supports creation with expand ", buildStripeParityTest(
        async (stripeClient) => {
            const customerExpanded = await stripeClient.customers.create({expand: ["sources", "subscriptions"]});
            return [customerExpanded];
        }
    ));

    it("creating and charging a default source", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({
                source: "tok_visa"
            });
            const charge = await stripeClient.charges.create({
                currency: "usd",
                amount: 8675309,
                customer: customer.id
            });
            return [customer, charge];
        }
    ));

    it("supports creating and charging an additional source", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({
                source: "tok_mastercard",
                expand: ["sources"]
            });
            const additionalSource = await stripeClient.customers.createSource(customer.id, {
                source: "tok_visa"
            }) as Stripe.Card;
            const customerWithAdditionalSource = await stripeClient.customers.retrieve(customer.id, {expand: ["sources"]}) as Stripe.Customer;
            const charge = await stripeClient.charges.create({
                amount: 1000,
                currency: "usd",
                customer: customer.id,
                source: additionalSource.id
            });

            chai.assert.notEqual(additionalSource.id, customer.default_source);
            chai.assert.equal(customerWithAdditionalSource.default_source, customerWithAdditionalSource.sources.data[0].id);
            chai.assert.equal(customerWithAdditionalSource.sources.data[1].id, additionalSource.id);
            return [customer, additionalSource, customerWithAdditionalSource, charge];
        }
    ));

    it("errors on charging an invalid non-default source", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({
                source: "tok_visa"
            });
            let chargeError: any = null;
            try {
                await stripeClient.charges.create({
                    currency: "usd",
                    amount: 8675309,
                    customer: customer.id,
                    source: `invalid-${generateId(12)}`
                });
            } catch (err) {
                chargeError = err;
            }
            return [customer, chargeError];
        }
    ));

    it("supports tok_chargeDeclined", buildStripeParityTest(
        async (stripeClient) => {
            let customerError: any = null;
            try {
                await stripeClient.customers.create({
                    source: "tok_chargeDeclined"
                });
            } catch (err) {
                customerError = err;
            }
            return [customerError];
        }
    ));

    it("supports tok_chargeDeclinedInsufficientFunds", buildStripeParityTest(
        async (stripeClient) => {
            let customerError: any = null;
            try {
                await stripeClient.customers.create({
                    source: "tok_chargeDeclinedInsufficientFunds"
                });
            } catch (err) {
                customerError = err;
            }
            return [customerError];
        }
    ));

    it("supports tok_chargeDeclinedIncorrectCvc", buildStripeParityTest(
        async (stripeClient) => {
            let customerError: any = null;
            try {
                await stripeClient.customers.create({
                    source: "tok_chargeDeclinedIncorrectCvc"
                });
            } catch (err) {
                customerError = err;
            }
            return [customerError];
        }
    ));

    it("supports tok_chargeDeclinedIncorrectCvc", buildStripeParityTest(
        async (stripeClient) => {
            let customerError: any = null;
            try {
                await stripeClient.customers.create({
                    source: "tok_chargeDeclinedIncorrectCvc"
                });
            } catch (err) {
                customerError = err;
            }
            return [customerError];
        }
    ));

    it("supports tok_chargeDeclinedExpiredCard", buildStripeParityTest(
        async (stripeClient) => {
            let customerError: any = null;
            try {
                await stripeClient.customers.create({
                    source: "tok_chargeDeclinedExpiredCard"
                });
            } catch (err) {
                customerError = err;
            }
            return [customerError];
        }
    ));

    it("supports tok_chargeCustomerFail", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({
                source: "tok_chargeCustomerFail"
            });
            let chargeError: any = null;
            try {
                await stripeClient.charges.create({
                    currency: "usd",
                    amount: 8675309,
                    customer: customer.id
                });
            } catch (err) {
                chargeError = err;
            }
            return [customer, chargeError];
        }
    ));

    it("supports Stripe-Account header (Connect account)", buildStripeParityTest(
        async (stripeClient, mode) => {
            let connectedAccountId: string;
            if (mode === "live") {
                chai.assert.isString(process.env["STRIPE_CONNECTED_ACCOUNT_ID"], "connected account ID is set");
                connectedAccountId = process.env["STRIPE_CONNECTED_ACCOUNT_ID"];
            } else {
                const account = await stripeClient.accounts.create({type: "custom"});
                connectedAccountId = account.id;
            }

            const customer = await stripeClient.customers.create({source: "tok_visa"}, {stripeAccount: connectedAccountId});

            let retrieveError: any;
            try {
                await stripeClient.customers.retrieve(customer.id);
            } catch (err) {
                retrieveError = err;
            }
            chai.assert.isDefined(retrieveError, "customer should not be in the account, but should be in the connected account");

            const connectRetrieveCustomer = await stripeClient.customers.retrieve(customer.id, {stripeAccount: connectedAccountId});
            chai.assert.deepEqual(connectRetrieveCustomer, customer);

            const connectRetrieveCard = await stripeClient.customers.retrieveSource(customer.id, customer.default_source as string, {stripeAccount: connectedAccountId}) as Stripe.Card;
            chai.assert.equal(connectRetrieveCard.id, customer.default_source as string);

            return [customer, retrieveError, connectRetrieveCustomer, connectRetrieveCard];
        }
    ));

    it("can list customers", async () => {
        // Create a fresh account to get a clean slate.
        const account = await localStripeClient.accounts.create({type: "custom"});

        const listEmpty = await localStripeClient.customers.list({stripeAccount: account.id});
        chai.assert.lengthOf(listEmpty.data, 0);

        const customer0 = await localStripeClient.customers.create({email: "luser0@example.com"}, {stripeAccount: account.id});
        const listOne = await localStripeClient.customers.list({stripeAccount: account.id});
        chai.assert.lengthOf(listOne.data, 1);
        chai.assert.sameDeepMembers(listOne.data, [customer0]);

        const charge1 = await localStripeClient.customers.create({email: "luser1@example.com"}, {stripeAccount: account.id});
        const listTwo = await localStripeClient.customers.list({stripeAccount: account.id});
        chai.assert.lengthOf(listTwo.data, 2);
        chai.assert.sameDeepMembers(listTwo.data, [charge1, customer0]);

        const listLimit1 = await localStripeClient.customers.list({limit: 1}, {stripeAccount: account.id});
        chai.assert.lengthOf(listLimit1.data, 1);
        chai.assert.isUndefined(listLimit1.data[0].sources);
        chai.assert.isUndefined(listLimit1.data[0].subscriptions);

        const listLimit1Expanded = await localStripeClient.customers.list({
            limit: 1,
            expand: ["sources", "subscriptions"]
        }, {stripeAccount: account.id});
        chai.assert.lengthOf(listLimit1Expanded.data, 1);
        chai.assert.isDefined(listLimit1Expanded.data[0].sources);
        chai.assert.isDefined(listLimit1Expanded.data[0].subscriptions);

        const listLimit2 = await localStripeClient.customers.list({
            limit: 1,
            starting_after: listLimit1.data[0].id
        }, {stripeAccount: account.id});
        chai.assert.lengthOf(listLimit1.data, 1);
        chai.assert.sameDeepMembers([...listLimit2.data, ...listLimit1.data], listTwo.data);
    });

    describe("unofficial token support", () => {
        describe("tok_forget", () => {
            it("forgets the customer when specified on customer create", async () => {
                const customer = await localStripeClient.customers.create({
                    source: "tok_forget"
                });
                chai.assert.isString(customer.id);

                let getCustomerError: any;
                try {
                    await localStripeClient.customers.retrieve(customer.id);
                } catch (err) {
                    getCustomerError = err;
                }

                chai.assert.isDefined(getCustomerError);
                chai.assert.equal(getCustomerError.statusCode, 404);
            });
        });
    });

    describe("deleting", () => {
        it("supports deleting the only source", buildStripeParityTest(
            async (stripeClient) => {
                const customerBeforeDelete = await stripeClient.customers.create({
                    source: "tok_visa"
                });
                await stripeClient.customers.deleteSource(customerBeforeDelete.id, customerBeforeDelete.default_source as string);
                const customerAfterDelete = await stripeClient.customers.retrieve(customerBeforeDelete.id);
                return [customerBeforeDelete, customerAfterDelete];
            }
        ));

        it("supports deleting the non-default_source", buildStripeParityTest(
            async (stripeClient) => {
                const customerBeforeDelete = await stripeClient.customers.create({
                    source: "tok_visa",
                    expand: ["sources"]
                });
                const secondSource = await stripeClient.customers.createSource(customerBeforeDelete.id, {source: "tok_visa"});
                await stripeClient.customers.deleteSource(customerBeforeDelete.id, secondSource.id);
                const customerAfterDelete = await stripeClient.customers.retrieve(customerBeforeDelete.id, {expand: ["sources"]});
                return [customerBeforeDelete, secondSource as Stripe.Card, customerAfterDelete];
            }
        ));

        it("supports deleting the default_source with a second source", buildStripeParityTest(
            async (stripeClient) => {
                const customerBeforeDelete = await stripeClient.customers.create({
                    source: "tok_visa",
                    expand: ["sources"]
                });
                const secondSource = await stripeClient.customers.createSource(customerBeforeDelete.id, {source: "tok_visa"});
                await stripeClient.customers.deleteSource(customerBeforeDelete.id, customerBeforeDelete.default_source as string);
                const customerAfterDelete = await stripeClient.customers.retrieve(customerBeforeDelete.id, {expand: ["sources"]});
                return [customerBeforeDelete, secondSource as Stripe.Card, customerAfterDelete];
            }
        ));
    });

    describe("updating", () => {
        it("supports updating", buildStripeParityTest(
            async (stripeClient) => {
                const customer = await stripeClient.customers.create({
                    source: "tok_visa"
                });
                const customerAfterUpdate = await stripeClient.customers.update(customer.id, {
                    description: "foobar",
                    email: "email@example.com",
                    name: "foo bar"
                });
                return [customer, customerAfterUpdate];
            }
        ));

        it("supports updating the default source", buildStripeParityTest(
            async (stripeClient) => {
                const customer = await stripeClient.customers.create({
                    source: "tok_visa"
                });
                const secondSource = await stripeClient.customers.createSource(customer.id, {source: "tok_visa"});
                const customerAfterUpdate = await stripeClient.customers.update(customer.id, {default_source: secondSource.id});
                chai.assert.equal(customerAfterUpdate.default_source, secondSource.id);
                return [customer, secondSource as Stripe.Card, customerAfterUpdate];
            }
        ));

        it("errors updating the default source to a non-existant source", buildStripeParityTest(
            async (stripeClient) => {
                const customer = await stripeClient.customers.create({
                    source: "tok_visa"
                });

                let updateError: any = null;
                try {
                    await stripeClient.customers.update(customer.id, {default_source: generateId()});
                } catch (err) {
                    updateError = err;
                }
                return [customer, updateError];
            }
        ));

        it("supports updating the source", buildStripeParityTest(
            async (stripeClient) => {
                const customer = await stripeClient.customers.create({});
                const customerAfterUpdate = await stripeClient.customers.update(customer.id, {
                    source: "tok_visa",
                    expand: ["sources"]
                });
                const customerGet = await stripeClient.customers.retrieve(customer.id, {expand: ["sources"]});
                chai.assert.isString(customerAfterUpdate.default_source);
                chai.assert.lengthOf(customerAfterUpdate.sources.data, 1);
                return [customer, customerAfterUpdate, customerGet];
            }
        ));
    });
});
