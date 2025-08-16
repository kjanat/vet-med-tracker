import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicFooter } from "../public-footer";

describe("PublicFooter", () => {
  it("should render absolute links for homepage hash fragments", () => {
    render(<PublicFooter />);

    // Check that hash links always use absolute paths
    const featuresLink = screen.getByRole("link", { name: "Features" });
    const howItWorksLink = screen.getByRole("link", { name: "How It Works" });
    const pricingLink = screen.getByRole("link", { name: "Pricing" });

    expect(featuresLink).toHaveAttribute("href", "/#features");
    expect(howItWorksLink).toHaveAttribute("href", "/#demo");
    expect(pricingLink).toHaveAttribute("href", "/#pricing");
  });

  it("should use typed routes for all non-hash links", () => {
    render(<PublicFooter />);

    // Check that all page links use the correct typed routes
    const securityLink = screen.getByRole("link", { name: "Security" });
    const aboutLink = screen.getByRole("link", { name: "About" });
    const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });

    expect(securityLink).toHaveAttribute("href", "/security");
    expect(aboutLink).toHaveAttribute("href", "/about");
    expect(privacyLink).toHaveAttribute("href", "/privacy");
  });
});
