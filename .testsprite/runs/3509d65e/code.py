import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("https://castle-tomorrow-winning-florists.trycloudflare.com")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the dropdown control under 'Seleccione una empresa', choose the 'Admagro' option from the list, and wait 5 seconds for the client connection to complete.
        # Click the dropdown control under 'Seleccione una empresa', choose the 'Admagro' option from the list, and wait 5 seconds for the client connection to complete.
        elem = page.locator('xpath=/html/body/main/div/section[2]/form/div/div/div')
        await elem.click(timeout=10000)
        
        # -> Click the dropdown control under 'Seleccione una empresa', choose the 'Admagro' option from the list, and wait 5 seconds for the client connection to complete.
        # Admagro
        elem = page.get_by_text('Admagro', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill 'HOC' into the Usuario field and '1327' into the Contraseña field, then click the 'Ingresar' button.
        # text field
        elem = page.locator('xpath=/html/body/main/div/section[2]/form/div[2]/input')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("HOC")
        
        # -> Fill 'HOC' into the Usuario field and '1327' into the Contraseña field, then click the 'Ingresar' button.
        # password field
        elem = page.locator('xpath=/html/body/main/div/section[2]/form/div[3]/input')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("1327")
        
        # -> Fill 'HOC' into the Usuario field and '1327' into the Contraseña field, then click the 'Ingresar' button.
        # Ingresar button
        elem = page.get_by_role('button', name='Ingresar', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The browser URL path is /home
        # Assert: The browser URL path contains '/home'.
        await expect(page).to_have_url(re.compile("/home"), timeout=15000), "The browser URL path contains '/home'. "
        
        # --> The page shows the dashboard statistic title 'Total de bienes' and the sidebar navigation with the GABU logo
        # Assert: The dashboard displays the statistic title 'Total de bienes'.
        await expect(page.locator("xpath=/html/body/div[3]/div/main/div[1]/div/div[1]/div[1]/p[1]").nth(0)).to_have_text("Total de bienes", timeout=15000), "The dashboard displays the statistic title 'Total de bienes'."
        # Assert: The sidebar shows the GABU logo with alt 'gabu_logo'.
        await expect(page.locator("xpath=/html/body/div[3]/aside/div/img").nth(0)).to_have_attribute("alt", "gabu_logo", timeout=15000), "The sidebar shows the GABU logo with alt 'gabu_logo'."
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    