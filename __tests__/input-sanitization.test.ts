import { describe, expect, it } from "bun:test";
import {
  InputSanitizer,
  secureSchemas,
} from "../lib/security/input-sanitization";

describe("InputSanitizer", () => {
  describe("sanitizeString", () => {
    it("should escape HTML special characters", () => {
      const result = InputSanitizer.sanitizeString(
        "<script>alert('xss')</script>",
      );
      expect(result).toBe(
        "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;",
      );
    });

    it("should escape angle brackets", () => {
      expect(InputSanitizer.sanitizeString("<div>")).toBe("&lt;div&gt;");
    });

    it("should escape quotes", () => {
      expect(InputSanitizer.sanitizeString('"test"')).toBe("&quot;test&quot;");
      expect(InputSanitizer.sanitizeString("'test'")).toBe("&#x27;test&#x27;");
    });

    it("should escape forward slashes", () => {
      expect(InputSanitizer.sanitizeString("path/to/file")).toBe(
        "path&#x2F;to&#x2F;file",
      );
    });

    it("should trim whitespace", () => {
      expect(InputSanitizer.sanitizeString("  hello  ")).toBe("hello");
    });

    it("should handle empty strings", () => {
      expect(InputSanitizer.sanitizeString("")).toBe("");
    });

    it("should handle non-string input", () => {
      expect(InputSanitizer.sanitizeString(123 as unknown as string)).toBe("");
      expect(InputSanitizer.sanitizeString(null as unknown as string)).toBe("");
      expect(
        InputSanitizer.sanitizeString(undefined as unknown as string),
      ).toBe("");
    });

    it("should handle normal text without special characters", () => {
      expect(InputSanitizer.sanitizeString("hello world")).toBe("hello world");
    });

    it("should handle mixed special characters", () => {
      const result = InputSanitizer.sanitizeString(
        '<div class="test">Hello</div>',
      );
      expect(result).toBe(
        "&lt;div class=&quot;test&quot;&gt;Hello&lt;&#x2F;div&gt;",
      );
    });
  });

  describe("sanitizeHtml", () => {
    it("should delegate to sanitizeString", () => {
      const result = InputSanitizer.sanitizeHtml(
        "<script>alert('xss')</script>",
      );
      expect(result).toBe(
        "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;",
      );
    });

    it("should handle HTML content", () => {
      const result = InputSanitizer.sanitizeHtml("<p>Test paragraph</p>");
      expect(result).toBe("&lt;p&gt;Test paragraph&lt;&#x2F;p&gt;");
    });
  });

  describe("sanitizeEmail", () => {
    it("should sanitize and lowercase valid email", () => {
      expect(InputSanitizer.sanitizeEmail("Test@Example.COM")).toBe(
        "test@example.com",
      );
    });

    it("should return empty string for invalid email", () => {
      expect(InputSanitizer.sanitizeEmail("not-an-email")).toBe("");
      expect(InputSanitizer.sanitizeEmail("missing@domain")).toBe("");
      expect(InputSanitizer.sanitizeEmail("@domain.com")).toBe("");
      expect(InputSanitizer.sanitizeEmail("user@")).toBe("");
    });

    it("should handle emails with special characters", () => {
      expect(InputSanitizer.sanitizeEmail("user+tag@example.com")).toBe(
        "user+tag@example.com",
      );
    });

    it("should sanitize HTML in email", () => {
      expect(InputSanitizer.sanitizeEmail("<script>@test.com")).toBe(
        "&lt;script&gt;@test.com",
      );
    });

    it("should trim whitespace from email", () => {
      expect(InputSanitizer.sanitizeEmail("  test@example.com  ")).toBe(
        "test@example.com",
      );
    });

    it("should handle empty email", () => {
      expect(InputSanitizer.sanitizeEmail("")).toBe("");
    });
  });

  describe("sanitizePhone", () => {
    it("should preserve valid phone characters", () => {
      expect(InputSanitizer.sanitizePhone("+1 (555) 123-4567")).toBe(
        "+1 (555) 123-4567",
      );
    });

    it("should remove invalid characters", () => {
      expect(InputSanitizer.sanitizePhone("555-1234abc")).toBe("555-1234");
    });

    it("should remove special characters except allowed", () => {
      expect(InputSanitizer.sanitizePhone("555@1234#5678")).toBe("55512345678");
    });

    it("should trim whitespace", () => {
      expect(InputSanitizer.sanitizePhone("  555-1234  ")).toBe("555-1234");
    });

    it("should handle empty phone", () => {
      expect(InputSanitizer.sanitizePhone("")).toBe("");
    });

    it("should handle international format", () => {
      expect(InputSanitizer.sanitizePhone("+44 20 1234 5678")).toBe(
        "+44 20 1234 5678",
      );
    });
  });

  describe("sanitizeNumber", () => {
    it("should handle numeric input", () => {
      expect(InputSanitizer.sanitizeNumber(123)).toBe(123);
      expect(InputSanitizer.sanitizeNumber(123.45)).toBe(123.45);
      expect(InputSanitizer.sanitizeNumber(0)).toBe(0);
      expect(InputSanitizer.sanitizeNumber(-123)).toBe(-123);
    });

    it("should parse numeric strings", () => {
      expect(InputSanitizer.sanitizeNumber("123")).toBe(123);
      expect(InputSanitizer.sanitizeNumber("123.45")).toBe(123.45);
      expect(InputSanitizer.sanitizeNumber("-123.45")).toBe(-123.45);
    });

    it("should return null for invalid numbers", () => {
      expect(InputSanitizer.sanitizeNumber("not a number")).toBe(null);
      expect(InputSanitizer.sanitizeNumber("")).toBe(null);
      expect(InputSanitizer.sanitizeNumber("abc123")).toBe(null);
    });

    it("should handle scientific notation", () => {
      expect(InputSanitizer.sanitizeNumber("1e3")).toBe(1000);
      expect(InputSanitizer.sanitizeNumber("1.5e2")).toBe(150);
    });

    it("should handle Infinity", () => {
      expect(InputSanitizer.sanitizeNumber(Infinity)).toBe(Infinity);
      expect(InputSanitizer.sanitizeNumber("Infinity")).toBe(Infinity);
    });
  });

  describe("sanitizeFileName", () => {
    it("should remove path components", () => {
      expect(InputSanitizer.sanitizeFileName("/path/to/file.txt")).toBe(
        "file.txt",
      );
      expect(InputSanitizer.sanitizeFileName("C:\\path\\to\\file.txt")).toBe(
        "file.txt",
      );
    });

    it("should preserve safe characters", () => {
      expect(InputSanitizer.sanitizeFileName("my-file_123.txt")).toBe(
        "my-file_123.txt",
      );
    });

    it("should replace unsafe characters with underscores", () => {
      expect(InputSanitizer.sanitizeFileName("my file!@#.txt")).toBe(
        "my_file___.txt",
      );
    });

    it("should handle special characters", () => {
      expect(InputSanitizer.sanitizeFileName('file<>:"\\|?*.txt')).toBe(
        "___.txt",
      );
    });

    it("should limit filename length to 255 characters", () => {
      const longName = `${"a".repeat(300)}.txt`;
      const result = InputSanitizer.sanitizeFileName(longName);
      expect(result.length).toBe(255);
    });

    it("should handle empty filename", () => {
      expect(InputSanitizer.sanitizeFileName("")).toBe("");
    });

    it("should preserve multiple dots", () => {
      expect(InputSanitizer.sanitizeFileName("archive.tar.gz")).toBe(
        "archive.tar.gz",
      );
    });

    it("should handle directory traversal attempts", () => {
      expect(InputSanitizer.sanitizeFileName("../../etc/passwd")).toBe(
        "passwd",
      );
      expect(InputSanitizer.sanitizeFileName("..\\..\\windows\\system32")).toBe(
        "system32",
      );
    });
  });
});

describe("secureSchemas", () => {
  describe("email", () => {
    it("should validate valid emails", () => {
      expect(secureSchemas.email.safeParse("test@example.com").success).toBe(
        true,
      );
    });

    it("should reject invalid emails", () => {
      expect(secureSchemas.email.safeParse("not-an-email").success).toBe(false);
    });
  });

  describe("phone", () => {
    it("should validate phone numbers under max length", () => {
      expect(secureSchemas.phone.safeParse("+1234567890").success).toBe(true);
    });

    it("should reject phone numbers over max length", () => {
      expect(secureSchemas.phone.safeParse("a".repeat(21)).success).toBe(false);
    });
  });

  describe("safeString", () => {
    it("should validate strings within default length", () => {
      expect(secureSchemas.safeString().safeParse("hello").success).toBe(true);
    });

    it("should reject empty strings", () => {
      expect(secureSchemas.safeString().safeParse("").success).toBe(false);
    });

    it("should reject strings over max length", () => {
      expect(
        secureSchemas.safeString().safeParse("a".repeat(1001)).success,
      ).toBe(false);
    });

    it("should respect custom max length", () => {
      expect(secureSchemas.safeString(10).safeParse("hello").success).toBe(
        true,
      );
      expect(
        secureSchemas.safeString(10).safeParse("hello world").success,
      ).toBe(false);
    });
  });

  describe("safeText", () => {
    it("should validate text within default length", () => {
      expect(secureSchemas.safeText().safeParse("a".repeat(9999)).success).toBe(
        true,
      );
    });

    it("should reject text over max length", () => {
      expect(
        secureSchemas.safeText().safeParse("a".repeat(10001)).success,
      ).toBe(false);
    });

    it("should respect custom max length", () => {
      expect(
        secureSchemas.safeText(100).safeParse("a".repeat(99)).success,
      ).toBe(true);
      expect(
        secureSchemas.safeText(100).safeParse("a".repeat(101)).success,
      ).toBe(false);
    });
  });

  describe("safeNumber", () => {
    it("should validate finite numbers", () => {
      expect(secureSchemas.safeNumber.safeParse(123).success).toBe(true);
      expect(secureSchemas.safeNumber.safeParse(-123.45).success).toBe(true);
    });

    it("should reject infinite numbers", () => {
      expect(secureSchemas.safeNumber.safeParse(Infinity).success).toBe(false);
      expect(secureSchemas.safeNumber.safeParse(-Infinity).success).toBe(false);
    });

    it("should reject NaN", () => {
      expect(secureSchemas.safeNumber.safeParse(NaN).success).toBe(false);
    });
  });

  describe("positiveNumber", () => {
    it("should validate positive numbers", () => {
      expect(secureSchemas.positiveNumber().safeParse(1).success).toBe(true);
      expect(secureSchemas.positiveNumber().safeParse(123.45).success).toBe(
        true,
      );
    });

    it("should reject zero and negative numbers", () => {
      expect(secureSchemas.positiveNumber().safeParse(0).success).toBe(false);
      expect(secureSchemas.positiveNumber().safeParse(-1).success).toBe(false);
    });

    it("should respect custom max", () => {
      expect(secureSchemas.positiveNumber(100).safeParse(99).success).toBe(
        true,
      );
      expect(secureSchemas.positiveNumber(100).safeParse(101).success).toBe(
        false,
      );
    });
  });

  describe("uuid", () => {
    it("should validate valid UUIDs", () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      expect(secureSchemas.uuid.safeParse(validUuid).success).toBe(true);
    });

    it("should reject invalid UUIDs", () => {
      expect(secureSchemas.uuid.safeParse("not-a-uuid").success).toBe(false);
      expect(secureSchemas.uuid.safeParse("123-456-789").success).toBe(false);
    });
  });

  describe("url", () => {
    it("should validate valid URLs", () => {
      expect(secureSchemas.url().safeParse("https://example.com").success).toBe(
        true,
      );
      expect(
        secureSchemas.url().safeParse("http://test.org/path").success,
      ).toBe(true);
    });

    it("should reject invalid URLs", () => {
      expect(secureSchemas.url().safeParse("not-a-url").success).toBe(false);
      expect(secureSchemas.url().safeParse("example.com").success).toBe(false);
    });
  });

  describe("limitedArray", () => {
    it("should validate arrays within default limit", () => {
      const schema = secureSchemas.limitedArray(secureSchemas.safeNumber);
      expect(schema.safeParse(Array(50).fill(1)).success).toBe(true);
    });

    it("should reject arrays over default limit", () => {
      const schema = secureSchemas.limitedArray(secureSchemas.safeNumber);
      expect(schema.safeParse(Array(101).fill(1)).success).toBe(false);
    });

    it("should respect custom max items", () => {
      const schema = secureSchemas.limitedArray(secureSchemas.safeNumber, 5);
      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      expect(schema.safeParse([1, 2, 3, 4, 5, 6]).success).toBe(false);
    });
  });

  describe("recentDate", () => {
    it("should validate recent dates", () => {
      const now = new Date();
      expect(secureSchemas.recentDate().safeParse(now).success).toBe(true);
    });

    it("should reject dates too far in past", () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 201);
      expect(secureSchemas.recentDate().safeParse(oldDate).success).toBe(false);
    });

    it("should reject dates too far in future", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(secureSchemas.recentDate().safeParse(futureDate).success).toBe(
        false,
      );
    });

    it("should respect custom max years back", () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 5);
      expect(secureSchemas.recentDate(10).safeParse(date).success).toBe(true);
      expect(secureSchemas.recentDate(3).safeParse(date).success).toBe(false);
    });

    it("should respect custom max years future", () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 2);
      expect(secureSchemas.recentDate(200, 5).safeParse(date).success).toBe(
        true,
      );
      expect(secureSchemas.recentDate(200, 1).safeParse(date).success).toBe(
        false,
      );
    });
  });
});
