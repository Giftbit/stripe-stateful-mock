import Stripe from "stripe";
import {port} from "../src/autoStart";

// That import above is enough to ensure the server gets started for testing.
// That's a bit obtuse but it's good enough.

let liveClient: Stripe;
let localClient: Stripe;

export function getLiveStripeClient(): Stripe {
    if (!liveClient) {
        liveClient = new Stripe(process.env["STRIPE_TEST_SECRET_KEY"], {
            apiVersion: "2020-08-27"
        });
    }
    return liveClient;
}

export function getLocalStripeClient(): Stripe {
    if (!localClient) {
        localClient = new Stripe("sk_test_foobar", {
            apiVersion: "2020-08-27",
            host: "localhost",
            port: port,
            protocol: "http"
        });
    }
    return localClient;
}
