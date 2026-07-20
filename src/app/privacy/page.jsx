// src/app/privacy/page.jsx
//
// Basic privacy policy page for GenieBMS.
// Required by eBay for OAuth app registration (RuName setup).
// Review and customize wording with a lawyer before public launch --
// this is a reasonable starting draft, not legal advice.

export const metadata = {
    title: "Privacy Policy | GenieBMS",
};

export default function PrivacyPolicy() {
    return (
        <main
            style={{
                maxWidth: "800px",
                margin: "0 auto",
                padding: "48px 24px",
                lineHeight: 1.7,
                fontFamily: "system-ui, sans-serif",
            }}
        >
            <h1>Privacy Policy</h1>
            <p>
                <strong>Last updated:</strong>{" "}
                {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })}
            </p>

            <p>
                GenieBMS (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) provides a
                business management platform for eBay sellers, including order
                tracking, inventory management, vendor management, and financial
                analytics. This Privacy Policy explains what information we collect,
                how we use it, and the choices you have.
            </p>

            <h2>1. Information We Collect</h2>
            <ul>
                <li>
                    <strong>Account information</strong> you provide when signing up
                    (name, email, business details).
                </li>
                <li>
                    <strong>eBay account data</strong> you authorize us to access via
                    eBay&apos;s API, including order details, transaction and fee
                    information, and related seller account data, used solely to
                    power the features of GenieBMS.
                </li>
                <li>
                    <strong>Usage data</strong> such as pages visited and actions
                    taken within GenieBMS, used to improve the product.
                </li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <ul>
                <li>To provide and operate the GenieBMS platform for you.</li>
                <li>
                    To calculate order earnings, fees, and profitability using data
                    retrieved from eBay&apos;s API on your behalf.
                </li>
                <li>To communicate with you about your account or our service.</li>
                <li>To maintain the security and integrity of our platform.</li>
            </ul>

            <h2>3. How We Share Information</h2>
            <p>
                We do not sell your personal data. We do not share your eBay
                account data with third parties except as required to operate the
                service (e.g., our hosting and database providers) or as required
                by law.
            </p>

            <h2>4. eBay Data and Account Deletion</h2>
            <p>
                If an eBay user closes or deletes their eBay account, we receive a
                notification from eBay and will delete or anonymize any
                corresponding data we hold about that user in accordance with
                eBay&apos;s Marketplace Account Deletion/Closure Notification
                requirements.
            </p>

            <h2>5. Data Retention</h2>
            <p>
                We retain your data for as long as your account is active, or as
                needed to provide you the service. You may request deletion of
                your account and associated data at any time by contacting us.
            </p>

            <h2>6. Your Choices</h2>
            <p>
                You can disconnect your eBay account from GenieBMS at any time via
                eBay&apos;s{" "}
                <a
                    href="https://accountsettings.ebay.com/aim"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Third-Party App Access
                </a>{" "}
                settings, or by contacting us directly.
            </p>

            <h2>7. Security</h2>
            <p>
                We use industry-standard measures to protect your data, including
                encrypted storage of authentication tokens and secure data
                transmission.
            </p>

            <h2>8. Changes to This Policy</h2>
            <p>
                We may update this Privacy Policy from time to time. Changes will
                be posted on this page with an updated revision date.
            </p>

            <h2>9. Contact Us</h2>
            <p>
                If you have questions about this Privacy Policy, please contact us
                at{" "}
                <a href="mailto:support@geniebms.com">support@geniebms.com</a>.
            </p>
        </main>
    );
}