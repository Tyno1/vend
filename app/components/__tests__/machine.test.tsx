import { afterEach, describe, expect, it } from "@jest/globals";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { coinCounts } from "@/lib/coins";
import { Machine as VendingMachine } from "@/lib/machine";
import type { CoinCounts } from "@/lib/types";
import { Machine } from "../machine";

afterEach(() => {
  cleanup();
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function serve(stock?: CoinCounts) {
  const machine = new VendingMachine(stock);
  const fetchFromMachine: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/api/machine")) {
      return jsonResponse(machine.remainingCoins());
    }
    if (url.includes("/api/purchase")) {
      const outcome = machine.purchase(JSON.parse(String(init?.body)));
      return jsonResponse(outcome.body, outcome.status);
    }
    return jsonResponse("not found", 404);
  };
  window.fetch = fetchFromMachine;
}

function lcdText() {
  return document.querySelector(".lcd")?.textContent ?? "";
}

function drawerText() {
  return document.querySelector(".drawer")?.textContent ?? "";
}

async function payForApple(user: ReturnType<typeof userEvent.setup>, coins: string[]) {
  await user.click(screen.getByRole("button", { name: /Apple/ }));
  await user.type(screen.getByRole("textbox", { name: "Your name" }), "Ada");
  for (const coin of coins) {
    await user.click(screen.getByRole("button", { name: coin }));
  }
}

async function replaceName(user: ReturnType<typeof userEvent.setup>, name: string) {
  const field = screen.getByRole("textbox", { name: "Your name" });
  await user.clear(field);
  if (name.length > 0) await user.type(field, name);
}

async function payExact(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "50p" }));
  await user.click(screen.getByRole("button", { name: "10p" }));
  await user.click(screen.getByRole("button", { name: "Vend" }));
  expect(await screen.findByText("Exact amount. There is no change.", { exact: false })).toBeTruthy();
}

describe("the vending screen", () => {
  it("shows the products and an empty drawer before anyone pays", async () => {
    serve();
    render(<Machine />);

    expect(screen.getByRole("button", { name: /Still water/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Apple/ })).toBeTruthy();
    expect(drawerText()).toMatch(/Nothing dispensed yet/);
    const nameField = screen.getByRole("textbox", { name: "Your name" });
    expect(nameField).toBeInstanceOf(HTMLInputElement);
    if (nameField instanceof HTMLInputElement) expect(nameField.value).toBe("");
    expect(await screen.findByText("£38.80 left")).toBeTruthy();
  });

  it("shows the price and the amount being paid as coins are inserted", async () => {
    serve();
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("£38.80 left");

    await user.click(screen.getByRole("button", { name: /Apple/ }));
    expect(lcdText()).toMatch(/D2\s+Apple/);
    expect(lcdText()).toMatch(/60p/);
    expect(lcdText()).toMatch(/0p/);

    await user.click(screen.getByRole("button", { name: "£1" }));
    expect(lcdText()).toMatch(/Paying£1/);
    expect(lcdText()).toMatch(/Change40p/);
  });

  it("returns the money when the customer asks for it back", async () => {
    serve();
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("£38.80 left");

    await user.click(screen.getByRole("button", { name: "£1" }));
    await user.click(screen.getByRole("button", { name: "Return money" }));
    expect(lcdText()).toMatch(/Paying0p/);
    const returnMoney = screen.getByRole("button", { name: "Return money" });
    expect(returnMoney).toBeInstanceOf(HTMLButtonElement);
    if (returnMoney instanceof HTMLButtonElement) expect(returnMoney.disabled).toBe(true);
  });

  it("tells the customer to choose an item before taking payment", async () => {
    serve();
    render(<Machine />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Vend" }));
    expect(drawerText()).toMatch(/Choose an item/);
  });

  it("takes one sale when Vend is pressed twice, and ignores coins until that sale finishes", async () => {
    let releasePurchase = () => {};
    const purchaseStarted = new Promise<void>((resolve) => {
      releasePurchase = resolve;
    });
    serve();
    const fetchFromMachine = window.fetch;
    let purchases = 0;
    window.fetch = async (input, init) => {
      if (String(input).includes("/api/purchase")) {
        purchases += 1;
        await purchaseStarted;
      }
      return fetchFromMachine(input, init);
    };

    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("£38.80 left");
    await payForApple(user, ["50p"]);

    const form = screen.getByRole("button", { name: "Vend" }).closest("form");
    expect(form).toBeInstanceOf(HTMLFormElement);
    if (!(form instanceof HTMLFormElement)) return;

    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const vend = screen.getByRole("button", { name: "Vending…" });
    const pound = screen.getByRole("button", { name: "£1" });
    expect(vend).toBeInstanceOf(HTMLButtonElement);
    expect(pound).toBeInstanceOf(HTMLButtonElement);
    if (vend instanceof HTMLButtonElement) expect(vend.disabled).toBe(true);
    if (pound instanceof HTMLButtonElement) expect(pound.disabled).toBe(true);
    pound.click();

    releasePurchase();

    expect((await screen.findByText(/short of the 60p price/)).textContent).toMatch(/50p/);
    expect(purchases).toBe(1);
    expect(lcdText()).toMatch(/Paying50p/);
    const poundAfter = screen.getByRole("button", { name: "£1" });
    if (poundAfter instanceof HTMLButtonElement) expect(poundAfter.disabled).toBe(false);
  });

  it("dispenses an exact payment and leaves the change coins where they were", async () => {
    serve();
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("£38.80 left");

    await payForApple(user, ["50p", "10p"]);
    await user.click(screen.getByRole("button", { name: "Vend" }));

    expect(await screen.findByText(/Exact amount\. There is no change\./)).toBeTruthy();
    expect(drawerText()).toMatch(/No coins in the drawer/);
    expect(screen.getByText("£38.80 left")).toBeTruthy();
    expect(lcdText()).toMatch(/Paying0p/);
  });

  it("shows the coins handed back and the coins that remain", async () => {
    serve();
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("£38.80 left");

    await payForApple(user, ["£1"]);
    await user.click(screen.getByRole("button", { name: "Vend" }));

    expect((await screen.findByText(/Change 40p/)).textContent).toMatch(/2 × 20p/);
    expect(document.querySelector(".change")?.textContent).toBe("20p20p");
    expect(await screen.findByText("£38.40 left")).toBeTruthy();
  });

  it("refuses a short payment and keeps both the money and the coins", async () => {
    serve();
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("£38.80 left");

    await payForApple(user, ["50p"]);
    await user.click(screen.getByRole("button", { name: "Vend" }));

    expect((await screen.findByText(/short of the 60p price/)).textContent).toMatch(/50p/);
    expect(drawerText()).toMatch(/Short/);
    expect(screen.getByText("£38.80 left")).toBeTruthy();
    expect(lcdText()).toMatch(/Paying50p/);
  });

  it("says when the coins left cannot make the change", async () => {
    const stock = coinCounts(0);
    stock[50] = 1;
    serve(stock);
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("50p left");

    await payForApple(user, ["£1"]);
    await user.click(screen.getByRole("button", { name: "Vend" }));

    expect((await screen.findByText(/make 40p in change/)).textContent).toMatch(/coins it has left/);
    expect(screen.getByText("50p left")).toBeTruthy();
  });

  it("shows how long this name must wait after three purchases", async () => {
    serve();
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("£38.80 left");

    await user.click(screen.getByRole("button", { name: /Apple/ }));
    await user.type(screen.getByRole("textbox", { name: "Your name" }), "Ada");
    for (let purchase = 0; purchase < 3; purchase += 1) {
      await user.click(screen.getByRole("button", { name: "50p" }));
      await user.click(screen.getByRole("button", { name: "10p" }));
      await user.click(screen.getByRole("button", { name: "Vend" }));
      expect(await screen.findByText("Exact amount. There is no change.", { exact: false })).toBeTruthy();
    }

    await user.click(screen.getByRole("button", { name: "50p" }));
    await user.click(screen.getByRole("button", { name: "10p" }));
    await user.click(screen.getByRole("button", { name: "Vend" }));

    expect(drawerText()).toMatch(/Limit reached/);
    expect(drawerText()).toMatch(/try again in/);
  });

  it("lets a different name buy while the first name is waiting", async () => {
    serve();
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("£38.80 left");

    await user.click(screen.getByRole("button", { name: /Apple/ }));
    await user.type(screen.getByRole("textbox", { name: "Your name" }), "Ada");
    for (let purchase = 0; purchase < 3; purchase += 1) await payExact(user);

    await replaceName(user, "Bea");
    await payExact(user);
    expect(drawerText()).toMatch(/Exact amount/);
  });

  it("treats spacing and letter case as the same person", async () => {
    serve();
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("£38.80 left");

    await user.click(screen.getByRole("button", { name: /Apple/ }));
    for (const name of ["Ada", " ada ", "ADA"]) {
      await replaceName(user, name);
      await payExact(user);
    }

    await replaceName(user, "Ada");
    await user.click(screen.getByRole("button", { name: "50p" }));
    await user.click(screen.getByRole("button", { name: "10p" }));
    await user.click(screen.getByRole("button", { name: "Vend" }));

    expect(drawerText()).toMatch(/Limit reached/);
  });

  it("asks for a name and still sells once one is entered", async () => {
    serve();
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("£38.80 left");

    await user.click(screen.getByRole("button", { name: /Apple/ }));
    await user.click(screen.getByRole("button", { name: "50p" }));
    await user.click(screen.getByRole("button", { name: "10p" }));
    await user.click(screen.getByRole("button", { name: "Vend" }));

    expect(drawerText()).toMatch(/Needs a correction/);
    expect(drawerText()).toMatch(/Enter a name/);
    expect(screen.getByText("£38.80 left")).toBeTruthy();
    expect(lcdText()).toMatch(/Paying60p/);

    await user.type(screen.getByRole("textbox", { name: "Your name" }), "Ada");
    await user.click(screen.getByRole("button", { name: "Vend" }));
    expect(await screen.findByText("Exact amount. There is no change.", { exact: false })).toBeTruthy();
  });

  it("hands back three 20p coins when a 50p would leave change it cannot finish", async () => {
    const stock = coinCounts(0);
    stock[50] = 1;
    stock[20] = 3;
    serve(stock);
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("£1.10 left");

    await payForApple(user, ["£1", "20p"]);
    await user.click(screen.getByRole("button", { name: "Vend" }));

    expect((await screen.findByText(/Change 60p/)).textContent).toMatch(/3 × 20p/);
    expect(document.querySelector(".change")?.textContent).toBe("20p20p20p");
    expect(await screen.findByText("50p left")).toBeTruthy();
  });

  it("refuses the next customer once that change coin has been handed back", async () => {
    const stock = coinCounts(0);
    stock[20] = 1;
    serve(stock);
    render(<Machine />);
    const user = userEvent.setup();
    await screen.findByText("20p left");

    await payForApple(user, ["50p", "20p", "10p"]);
    await user.click(screen.getByRole("button", { name: "Vend" }));
    expect((await screen.findByText(/Change 20p/)).textContent).toMatch(/1 × 20p/);
    expect(await screen.findByText("0p left")).toBeTruthy();

    await replaceName(user, "Bea");
    await user.click(screen.getByRole("button", { name: "50p" }));
    await user.click(screen.getByRole("button", { name: "20p" }));
    await user.click(screen.getByRole("button", { name: "10p" }));
    await user.click(screen.getByRole("button", { name: "Vend" }));

    expect((await screen.findByText(/make 20p in change/)).textContent).toMatch(/coins it has left/);
    expect(drawerText()).toMatch(/isn.t possible/);
    expect(screen.getByText("0p left")).toBeTruthy();
  });
});
