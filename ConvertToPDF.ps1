$docPath = Join-Path (Get-Location).Path "noi.docx"
$pdfPath = Join-Path (Get-Location).Path "noi.pdf"

# Create Word application
$word = New-Object -ComObject Word.Application
$word.Visible = $false

try {
    # Open document
    Write-Host "Opening document $docPath..."
    $doc = $word.Documents.Open($docPath)
    
    # Save as PDF
    Write-Host "Converting to PDF..."
    $doc.SaveAs([ref]$pdfPath, [ref]17) # 17 = PDF format
    
    # Close document
    $doc.Close()
    Write-Host "Successfully converted $docPath to $pdfPath"
} 
catch {
    Write-Host "Error: $_"
} 
finally {
    # Quit Word application
    $word.Quit()
    Write-Host "Word application closed"
} 