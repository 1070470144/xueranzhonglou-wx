param(
    [string]$JsonPath = "C:\Users\mengmenglv\Desktop\#指鹅为鸭-V647刘子奇(1).json",
    [string]$ImagePath = "C:\Users\mengmenglv\Desktop\a988d201e206d7a76691548381facb1e.jpg",
    [string]$OutputPath = "D:\MyData\xueranzhonglou-wx\output\coderelay-test.png",
    [switch]$SmokeTest
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

if (-not $env:CODERELAY_API_KEY) {
    throw "Missing CODERELAY_API_KEY environment variable."
}

$items = Get-Content -LiteralPath $JsonPath -Raw | ConvertFrom-Json
$meta = $items | Where-Object { $_.id -eq "_meta" } | Select-Object -First 1
$roles = $items | Where-Object { $_.id -ne "_meta" }

$teamNames = @{
    townsfolk = "善良阵营·鹅"
    outsider = "善良阵营·中立"
    minion = "邪恶阵营·鸭"
    demon = "邪恶阵营·带刀鸭"
    traveller = "旅行者"
    fabled = "传奇/规则"
}

$sections = New-Object System.Collections.Generic.List[string]
foreach ($team in @("townsfolk", "outsider", "minion", "demon", "traveller", "fabled")) {
    $lines = New-Object System.Collections.Generic.List[string]
    $teamRoles = $roles | Where-Object { $_.team -eq $team }
    foreach ($role in $teamRoles) {
        $lines.Add(("- {0}：{1}" -f $role.name, $role.ability))
    }
    if ($lines.Count -gt 0) {
        $sections.Add(("【{0}】`n{1}" -f $teamNames[$team], ($lines -join "`n")))
    }
}

$firstNight = ($roles |
    Where-Object { $null -ne $_.firstNight } |
    Sort-Object firstNight |
    ForEach-Object { "- $($_.name)" }) -join "`n"

$otherNight = ($roles |
    Where-Object { $null -ne $_.otherNight } |
    Sort-Object otherNight |
    ForEach-Object { "- $($_.name)" }) -join "`n"

if ($SmokeTest) {
    $prompt = @"
基于输入图片做轻量图像编辑测试：保留原图的整体版式、纸张质感、边框、标题风格和中文角色表布局。
只做以下少量替换，用于测试接口是否能正常输出：
1. 把主标题改为「$($meta.name)」。
2. 把作者改为「$($meta.author)」。
3. 把左侧首夜顺序前几项改为：变形者、间谍、隐形者、雇佣杀手、鸽子。
4. 把右侧其他夜晚顺序前几项改为：任务、变形者、间谍、专业杀手、鸽子。
要求输出仍是一张高清中文桌游角色表图片，文字尽量清晰，不要改变原海报风格。
"@
} else {
    $prompt = @"
基于输入图片进行精确图像编辑：保留原图的海报比例、纸张质感、标题区、装饰边框、双栏角色排版、左右夜晚顺序栏、颜色风格、分割线、中文桌游剧本版式和整体美术风格，只替换其中的角色信息、阵营标题、作者、剧本名和夜晚顺序。

剧本名改为「$($meta.name)」，作者改为「$($meta.author)」。支持人数可以保留原位置与风格。

请把中央角色内容替换为以下内容，按阵营分区排版，善良阵营使用蓝色标题，邪恶阵营使用红色标题，旅行者和传奇规则保持清晰分区：

$($sections -join "`n`n")

请把左侧“首夜”顺序栏替换为：
$firstNight

请把右侧“其他夜晚”顺序栏替换为：
$otherNight

重要要求：
1. 输出必须是一张完整高清中文角色表图片。
2. 保留原图的版式和装饰，不要改成网页、表格截图或纯文字文档。
3. 中文必须尽量清晰可读，避免乱码、错别字、重复字、文字重叠。
4. 如果空间不足，请自动缩小字号、压缩行距并保持整齐。
5. 不要增加无关角色，不要遗漏夜晚顺序。
"@
}

$outDir = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromMinutes(10)
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $env:CODERELAY_API_KEY)

$form = New-Object System.Net.Http.MultipartFormDataContent
$form.Add((New-Object System.Net.Http.StringContent("gpt-image-2")), "model")
$form.Add((New-Object System.Net.Http.StringContent($prompt, [System.Text.Encoding]::UTF8)), "prompt")
$form.Add((New-Object System.Net.Http.StringContent("1024x1536")), "size")

$bytes = [System.IO.File]::ReadAllBytes($ImagePath)
$imageContent = New-Object System.Net.Http.ByteArrayContent(,$bytes)
$imageContent.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg")
$form.Add($imageContent, "image", [System.IO.Path]::GetFileName($ImagePath))

$response = $client.PostAsync("https://coderelay.cn/v1/images/edits", $form).GetAwaiter().GetResult()
$body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

if (-not $response.IsSuccessStatusCode) {
    Write-Error ("HTTP {0}: {1}" -f [int]$response.StatusCode, $body)
}

$json = $body | ConvertFrom-Json
$item = $json.data[0]

if ($item.b64_json) {
    [System.IO.File]::WriteAllBytes($OutputPath, [Convert]::FromBase64String($item.b64_json))
} elseif ($item.url) {
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($item.url, $OutputPath)
} else {
    throw "Response did not include b64_json or url: $body"
}

Write-Output $OutputPath
