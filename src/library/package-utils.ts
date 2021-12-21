import { writeFile } from "fs/promises";
import fetch from "node-fetch";
import { Headers } from "node-fetch";
import { MsixInfo } from "../interfaces";

import * as vscode from "vscode";
import { AndroidPackageOptions } from "../services/package/package-android-app";

export const WindowsDocsURL = "https://blog.pwabuilder.com/docs/windows-platform/";

const advancedAndroidSettings: AndroidPackageOptions = {
  appVersion: "1.0.0.0",
  appVersionCode: 1,
  backgroundColor: "#FFFFFF",
  display: "standalone",
  enableNotifications: true,
  enableSiteSettingsShortcut: true,
  fallbackType: "customtabs",
  features: {
    locationDelegation: {
      enabled: true,
    },
    playBilling: {
      enabled: false,
    },
  },
  host: "https://myapp.com",
  iconUrl: "https://myapp.com/icon.png",
  maskableIconUrl: "https://myapp.com/maskable-icon.png",
  monochromeIconUrl: "https://myapp.com/monochrome-icon.png",
  includeSourceCode: false,
  isChromeOSOnly: false,
  launcherName: "app name", // launcher name should be the short name. If none is available, fallback to the full app name.
  name: "app name",
  navigationColor: "#FFFFFF",
  navigationColorDark: "#FFFFFF",
  navigationDividerColor: "#FFFFFF",
  navigationDividerColorDark: "#FFFFFF",
  orientation: "any",
  packageId: "com.myapp.pwa",
  shortcuts: [],
  signing: {
    file: null,
    alias: "my-key-alias",
    fullName: "Admin",
    organization: "PWABuilder",
    organizationalUnit: "Engineering",
    countryCode: "US",
    keyPassword: "", // If empty, one will be generated by CloudAPK service
    storePassword: "", // If empty, one will be generated by CloudAPK service
  },
  signingMode: "new",
  splashScreenFadeOutDuration: 300,
  startUrl: "/",
  themeColor: "#FFFFFF",
  shareTarget: ([] as any),
  webManifestUrl: "https://myapp.com/manifest.json",
};

export async function packageForWindows(options: any) {
  const response = await fetch(
    "https://pwabuilder-win-chromium-platform.centralus.cloudapp.azure.com/msix/generatezip",
    {
      method: "POST",
      body: JSON.stringify(options),
      headers: new Headers({ "content-type": "application/json" }),
    }
  );

  return response;
}

export function getSimpleMsixFromArray(...args: string[]): MsixInfo {
  // This creates an unsigned package. Should be considered the bare minimum.
  return {
    url: args[0],
    name: args[1],
    packageId: "com.example.pwa",
    version: "1.0.1",
    allowSigning: true,
    classicPackage: {
      generate: true,
      version: "1.0.0",
    },
  };
}

export function getPublisherMsixFromArray(...args: string[]): MsixInfo {
  return {
    url: args[0],
    name: args[1],
    packageId: args[2],
    version: args[3] || "1.0.1",
    allowSigning: true,
    classicPackage: {
      generate: true,
      version: args[4],
    },
    publisher: {
      displayName: args[5],
      commonName: args[6],
    },
  };
}

export async function buildAndroidPackage(options: AndroidPackageOptions) {
  const generateAppUrl = `https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage`;
  const response = await fetch(generateAppUrl, {
    method: "POST",
    body: JSON.stringify(options),
    headers: new Headers({ "content-type": "application/json" }),
  });

  return response;
}

export async function buildAndroidOptions(): Promise<AndroidPackageOptions | undefined> {
  const appUrl = await vscode.window.showInputBox({
    prompt: "Enter the URL to your app",
  });

  if (!appUrl) {
    await vscode.window.showErrorMessage("Please enter a URL");
    return;
  }

  const manifestUrl = await vscode.window.showInputBox({
    prompt: "Enter the URL to your manifest",
  });

  const packageId = await vscode.window.showInputBox({
    prompt: "Enter the package ID",
  });

  const version = await vscode.window.showInputBox({
    prompt: "Enter your app's version number",
    placeHolder: "1.0.0.0",
  });

  const advancedSettings = await vscode.window.showQuickPick(
    [
      {
        label: "Yes",
        description: "Advanced settings will be enabled",
      },
      {
        label: "No",
        description: "Advanced settings will not be enabled",
      },
    ],
    {
      title: "Change Advanced Settings such as signing information?",
    }
  );

  if (manifestUrl && packageId) {
    // fetch manifest from manifestUrl using node-fetch
    const manifestData = await (await fetch(manifestUrl)).json();
    const manifest = manifestData;

    // find icon with a size of 512x512 from manifest.icons
    const icon = manifest.icons.find((icon: any) => {
      if (icon.sizes && icon.sizes.includes("512x512")) {
        return icon;
      }
    });

    const maskableIcon = manifest.icons.find((icon: any) => {
      if (icon.purpose && icon.purpose.includes("maskable")) {
        return icon;
      }
    });

    if (!icon) {
      await vscode.window.showErrorMessage(
        "Your app cannot be packaged, please add an icon with a size of 512x512"
      );

      return;
    }

    if (!maskableIcon) {
      await vscode.window.showWarningMessage(
        "We highly recommend adding a maskable icon to your app, however your app can still be packaged without one"
      );
    }

    // make sure we have manifestUrl and packageId first
    if (advancedSettings && advancedSettings.label === "Yes") {
      // handle advanced settings
      const uri = await vscode.window.showSaveDialog({
        title: "Save advanced Android settings file to continue",
        defaultUri: vscode.Uri.file(
          `${vscode.workspace.workspaceFolders?.[0].uri.fsPath}}/android-settings.json`
        ),
      });
      if (uri) {
        await writeFile(
          uri.fsPath,
          JSON.stringify(advancedAndroidSettings, null, 2)
        );

        const textEditor = await vscode.window.showTextDocument(uri);

        try {
          const answer = await vscode.window.showQuickPick(
            [
              {
                label: "Save and Generate",
              },
              {
                label: "Cancel",
              },
            ],
            {
              title: "Save advanced settings and generate my package? Ensure you have edited your settings first.",
            }
          );

          if (answer && answer.label === "Save and Generate") {
            await textEditor.document.save();
            const options = await textEditor.document.getText();

            return JSON.parse(options);
          }
        } catch (err: any) {
          await vscode.window.showErrorMessage(
            err ? err.message : "Error writing android settings file"
          );
        }
      }
    }

    return {
      appVersion: version || "1.0.0.0",
      appVersionCode: 1,
      backgroundColor:
        manifest.background_color || manifest.theme_color || "#FFFFFF",
      display: manifest.display,
      enableNotifications: true,
      enableSiteSettingsShortcut: true,
      fallbackType: "customtabs",
      features: {
        locationDelegation: {
          enabled: true,
        },
        playBilling: {
          enabled: false,
        },
      },
      host: appUrl,
      iconUrl: `${appUrl}/${icon.src}`,
      maskableIconUrl: maskableIcon ? `${appUrl}/${maskableIcon.src}` : null,
      monochromeIconUrl: null,
      includeSourceCode: false,
      isChromeOSOnly: false,
      launcherName: manifest.short_name.substring(0, 30), // launcher name should be the short name. If none is available, fallback to the full app name.
      name: manifest.name,
      navigationColor: manifest.background_color || manifest.theme_color,
      navigationColorDark: manifest.background_color || manifest.theme_color,
      navigationDividerColor: manifest.background_color || manifest.theme_color,
      navigationDividerColorDark:
        manifest.background_color || manifest.theme_color,
      orientation: manifest.orientation || "default",
      packageId: packageId || "com.android.pwa",
      shortcuts: manifest.shortcuts || [],
      signing: {
        file: null,
        alias: "my-key-alias",
        fullName: `${manifest.short_name || manifest.name || "App"} Admin`,
        organization: manifest.name || "PWABuilder",
        organizationalUnit: "Engineering",
        countryCode: "US",
        keyPassword: "", // If empty, one will be generated by CloudAPK service
        storePassword: "", // If empty, one will be generated by CloudAPK service
      },
      signingMode: "new",
      splashScreenFadeOutDuration: 300,
      startUrl: manifest.start_url,
      themeColor: manifest.theme_color || "#FFFFFF",
      shareTarget: manifest.share_target || [],
      webManifestUrl: manifestUrl,
    };
  }
}
